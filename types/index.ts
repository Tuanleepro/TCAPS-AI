// ── Face Analysis ───────────────────────────────────────────
export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'oblong'

export interface HeadPose {
  roll:  number
  yaw:   number
  pitch: number
}

export interface KeyPoint {
  x: number
  y: number
}

export interface HeadKeyPoints {
  foreheadTop:  KeyPoint
  templeLeft:   KeyPoint
  templeRight:  KeyPoint
  eyeLeft:      KeyPoint
  eyeRight:     KeyPoint
  noseTip:      KeyPoint
  chin:         KeyPoint
  earLeft:      KeyPoint
  earRight:     KeyPoint
}

export interface FaceDetectionResult {
  detected:      boolean
  keyPoints:     HeadKeyPoints
  pose:          HeadPose
  headWidthPx:   number
  headHeightPx:  number
  imageWidth:    number
  imageHeight:   number
  faceShape:     FaceShape | null      // ← argmax of the measured distribution, or null
  shapeConfidence: number              // 0–1 (probability of the top shape)
  faceShapeScores: Record<FaceShape, number> | null   // probability % per shape (sums to 100), or null
  faceMeasurements: import('@/lib/face-analysis').FaceMeasurements | null  // raw measured geometry (traceability)
}

// ── Hat Asset ───────────────────────────────────────────────
export interface HatAsset {
  id:              string
  name:            string
  sku:             string
  overlayUrl:      string
  imageUrl:        string
  style:           'snapback' | 'trucker' | 'fitted' | 'bucket' | 'dad'
  crownHeight:     'low' | 'medium' | 'high'
  brimCurve:       'flat' | 'curved' | 'deep-curved'
  widthMultiplier: number
  offsetYRatio:    number
}

// ── Try-On State Machine ────────────────────────────────────
export type TryOnStep =
  | 'idle'
  | 'face-ready'
  | 'hat-ready'
  | 'both-ready'
  | 'detecting'        // MediaPipe face detection
  | 'compositing'      // local canvas compositor (real hat pixels)
  | 'processing'       // Gemini AI refining the composite
  | 'done'
  | 'error'

export interface TryOnState {
  step:            TryOnStep
  faceFile:        File | null
  faceUrl:         string | null
  hatFile:         File | null
  hatUrl:          string | null
  faceResult:      FaceDetectionResult | null
  selectedSku:     string | null
  resultUrl:       string | null     // final Gemini-refined + pixel-locked image
  enhanced:        boolean           // true once Gemini refine succeeded
  renderMs:        number | null     // Gemini AI render time (ms) — confirms AI ran
  qc:              import('@/lib/gemini/qcScore').QcScore | null   // Gemini Vision QC scores, or null if QC infra failed (fail-open)
  errorMessage:    string | null
  isProcessing:    boolean
}
