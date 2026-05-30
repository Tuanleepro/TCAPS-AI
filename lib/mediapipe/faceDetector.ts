'use client'

import type { FaceDetectionResult, HeadKeyPoints, HeadPose } from '@/types'

// MediaPipe FaceLandmarker 478-point indices
const LM = {
  FOREHEAD_TOP: 10,
  TEMPLE_L:     234,
  TEMPLE_R:     454,
  EAR_L:        127,
  EAR_R:        356,
  EYE_L_OUTER:  33,
  EYE_R_OUTER:  263,
  NOSE_TIP:     4,
  CHIN:         152,
} as const

// ── Singleton detector ─────────────────────────────────────
let _detectorPromise: Promise<import('@mediapipe/tasks-vision').FaceLandmarker> | null = null

async function buildDetector(delegate: 'GPU' | 'CPU') {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')

  // Use LOCAL wasm + model files — avoids CDN SSL issues on corporate networks
  const resolver = await FilesetResolver.forVisionTasks('/mediapipe/wasm')

  return FaceLandmarker.createFromOptions(resolver, {
    baseOptions: {
      modelAssetPath: '/mediapipe/models/face_landmarker.task',
      delegate,
    },
    outputFaceBlendshapes:              false,
    outputFacialTransformationMatrixes: true,
    runningMode: 'IMAGE',
    numFaces:    1,
  })
}

async function getDetector() {
  if (_detectorPromise) return _detectorPromise

  _detectorPromise = (async () => {
    // Try GPU first; fall back to CPU if it fails
    try {
      console.log('[MediaPipe] Loading with GPU delegate…')
      const d = await buildDetector('GPU')
      console.log('[MediaPipe] GPU delegate loaded ✓')
      return d
    } catch (gpuErr) {
      console.warn('[MediaPipe] GPU failed, falling back to CPU:', gpuErr)
      _detectorPromise = null  // allow retry
      try {
        const d = await buildDetector('CPU')
        console.log('[MediaPipe] CPU delegate loaded ✓')
        return d
      } catch (cpuErr) {
        _detectorPromise = null
        throw new Error(`MediaPipe load failed: ${cpuErr}`)
      }
    }
  })()

  return _detectorPromise
}

// ── Euler angles from 4×4 row-major matrix ─────────────────
function poseFromMatrix(m: number[]): HeadPose {
  // Standard ZYX decomposition
  const sy = Math.sqrt(m[0] ** 2 + m[4] ** 2)
  if (sy < 1e-6) {
    return {
      roll:  Math.atan2(-m[9], m[5])  * (180 / Math.PI),
      pitch: Math.atan2(-m[8], sy)    * (180 / Math.PI),
      yaw:   0,
    }
  }
  return {
    roll:  Math.atan2(m[4],  m[0])  * (180 / Math.PI),
    pitch: Math.atan2(-m[8], sy)    * (180 / Math.PI),
    yaw:   Math.atan2(m[9],  m[10]) * (180 / Math.PI),
  }
}

// ── Fallback 2D pose from landmark geometry ────────────────
function poseFromLandmarks(
  lm: Array<{ x: number; y: number }>,
  W: number, H: number,
): HeadPose {
  const lEye = lm[LM.EYE_L_OUTER]
  const rEye = lm[LM.EYE_R_OUTER]
  const nose = lm[LM.NOSE_TIP]
  const chin = lm[LM.CHIN]
  const fore = lm[LM.FOREHEAD_TOP]

  const roll = Math.atan2(
    (rEye.y - lEye.y) * H,
    (rEye.x - lEye.x) * W,
  ) * (180 / Math.PI)

  const cx  = (lm[LM.TEMPLE_L].x + lm[LM.TEMPLE_R].x) / 2
  const fw  = Math.abs(lm[LM.TEMPLE_R].x - lm[LM.TEMPLE_L].x)
  const yaw = fw > 0 ? ((nose.x - cx) / fw) * 50 : 0

  const span  = chin.y - fore.y
  const pitch = span > 0 ? ((nose.y - fore.y) / span - 0.42) * 40 : 0

  return { roll, yaw, pitch }
}

// ── Public API ─────────────────────────────────────────────
export async function detectFace(img: HTMLImageElement): Promise<FaceDetectionResult> {
  const W = img.naturalWidth
  const H = img.naturalHeight

  if (W === 0 || H === 0) throw new Error('Image has zero dimensions — check file format')

  const detector = await getDetector()
  const result   = detector.detect(img)

  const empty: FaceDetectionResult = {
    detected: false, keyPoints: {} as HeadKeyPoints,
    pose: { roll: 0, yaw: 0, pitch: 0 },
    headWidthPx: 0, headHeightPx: 0,
    imageWidth: W, imageHeight: H,
    faceShape: null, shapeConfidence: 0, faceShapeScores: null, faceMeasurements: null,
  }

  if (!result.faceLandmarks?.length) {
    console.warn('[MediaPipe] No face detected in image')
    return empty
  }

  const lm  = result.faceLandmarks[0]
  const px  = (p: { x: number; y: number }) => ({ x: p.x * W, y: p.y * H })

  const keyPoints: HeadKeyPoints = {
    foreheadTop:  px(lm[LM.FOREHEAD_TOP]),
    templeLeft:   px(lm[LM.TEMPLE_L]),
    templeRight:  px(lm[LM.TEMPLE_R]),
    eyeLeft:      px(lm[LM.EYE_L_OUTER]),
    eyeRight:     px(lm[LM.EYE_R_OUTER]),
    noseTip:      px(lm[LM.NOSE_TIP]),
    chin:         px(lm[LM.CHIN]),
    earLeft:      px(lm[LM.EAR_L]),
    earRight:     px(lm[LM.EAR_R]),
  }

  const mxArr = result.facialTransformationMatrixes
  const pose  = mxArr?.length && mxArr[0].data
    ? poseFromMatrix(Array.from(mxArr[0].data))
    : poseFromLandmarks(lm, W, H)

  const headWidthPx  = Math.abs(keyPoints.templeRight.x - keyPoints.templeLeft.x)
  const headHeightPx = Math.abs(keyPoints.chin.y - keyPoints.foreheadTop.y)

  // ── Face shape: REAL measurements (incl. jaw angle) → probability ─────────
  const { analyzeFaceLandmarks } = await import('@/lib/face-analysis')
  const analysis = analyzeFaceLandmarks(lm, W, H)   // null if not measurable

  if (analysis) {
    console.log('[MediaPipe] Face shape:', {
      top: analysis.top, confidence: (analysis.topProbability / 100).toFixed(2),
      scores: analysis.probabilities,
      measure: {
        lengthRatio: analysis.measurements.lengthRatio.toFixed(2),
        foreheadRatio: analysis.measurements.foreheadRatio.toFixed(2),
        jawRatio: analysis.measurements.jawRatio.toFixed(2),
        jawAngle: analysis.measurements.jawAngleDeg.toFixed(0) + '°',
      },
    })
  } else {
    console.warn('[MediaPipe] Face shape: not measurable — UI will show "chưa đủ dữ liệu"')
  }

  return {
    detected: true, keyPoints, pose,
    headWidthPx, headHeightPx,
    imageWidth: W, imageHeight: H,
    faceShape:       analysis ? analysis.top : null,
    shapeConfidence: analysis ? analysis.topProbability / 100 : 0,
    faceShapeScores: analysis ? analysis.probabilities : null,
    faceMeasurements: analysis ? analysis.measurements : null,
  }
}

export function fileToHTMLImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.naturalWidth === 0) {
        reject(new Error('Image loaded but has zero width — unsupported format?'))
        return
      }
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Không thể load ảnh — kiểm tra lại định dạng file'))
    }
    img.src = url
  })
}
