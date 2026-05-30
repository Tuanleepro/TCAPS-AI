// ─────────────────────────────────────────────────────────────────────────────
// TCAPS Face Analysis
//
// Turns MediaPipe Face Mesh / Face Landmarker points into REAL measurements and
// a face-shape probability distribution. Pure + deterministic — NO random, NO
// hardcoded per-user result. Every % is derived from the measured geometry, so
// it is fully traceable. Returns null when there is no usable measurement (the
// UI then shows "Chưa đủ dữ liệu" instead of a fabricated number).
// ─────────────────────────────────────────────────────────────────────────────

import type { FaceShape } from '@/types'

export const FACE_SHAPES = ['oval', 'round', 'square', 'heart', 'diamond', 'oblong'] as const

export type FaceShapeProbabilities = Record<FaceShape, number>   // each 0–100, sums to 100

export interface FaceMeasurements {
  faceLengthPx:     number   // forehead-top → chin
  foreheadWidthPx:  number
  cheekboneWidthPx: number   // widest part of the face (reference)
  jawWidthPx:       number
  jawAngleDeg:      number   // average gonial angle (chin–jaw corner–cheek)
  // Ratios relative to cheekbone width (the discriminating features):
  lengthRatio:      number   // faceLength / cheekbone
  foreheadRatio:    number   // forehead   / cheekbone
  jawRatio:         number   // jaw        / cheekbone
}

export interface FaceShapeAnalysis {
  measurements:   FaceMeasurements
  probabilities:  FaceShapeProbabilities
  ranked:         Array<{ shape: FaceShape; probability: number }>
  top:            FaceShape
  topProbability: number     // 0–100
}

interface Pt { x: number; y: number }

// MediaPipe FaceMesh (468/478) landmark indices used for the measurements.
const LM = {
  FOREHEAD_TOP: 10,
  CHIN:         152,
  FOREHEAD_L:   70,  FOREHEAD_R:  300,   // upper forehead near temples
  CHEEK_L:      234, CHEEK_R:     454,   // widest (zygomatic) — reference width
  JAW_L:        172, JAW_R:       397,   // jaw corners (gonion)
} as const

function dist(a: Pt, b: Pt, W: number, H: number): number {
  return Math.hypot((a.x - b.x) * W, (a.y - b.y) * H)
}

// Angle (degrees) at vertex `v` between v→a and v→b.
function angleAt(v: Pt, a: Pt, b: Pt, W: number, H: number): number {
  const ux = (a.x - v.x) * W, uy = (a.y - v.y) * H
  const wx = (b.x - v.x) * W, wy = (b.y - v.y) * H
  const mu = Math.hypot(ux, uy), mw = Math.hypot(wx, wy)
  if (mu === 0 || mw === 0) return 0
  const c = Math.max(-1, Math.min(1, (ux * wx + uy * wy) / (mu * mw)))
  return (Math.acos(c) * 180) / Math.PI
}

/** Measure real face geometry from landmarks. Returns null if unusable. */
export function measureFace(lm: Pt[] | undefined, W: number, H: number): FaceMeasurements | null {
  if (!lm || lm.length < 468 || !(W > 0) || !(H > 0)) return null

  const faceLength = dist(lm[LM.FOREHEAD_TOP], lm[LM.CHIN],     W, H)
  const forehead   = dist(lm[LM.FOREHEAD_L],   lm[LM.FOREHEAD_R], W, H)
  const cheek      = dist(lm[LM.CHEEK_L],      lm[LM.CHEEK_R],   W, H)
  const jaw        = dist(lm[LM.JAW_L],        lm[LM.JAW_R],     W, H)

  if (!(cheek > 0) || !(faceLength > 0)) return null

  // Gonial angle at each jaw corner (chin ↔ corner ↔ cheekbone), averaged.
  const angL = angleAt(lm[LM.JAW_L], lm[LM.CHIN], lm[LM.CHEEK_L], W, H)
  const angR = angleAt(lm[LM.JAW_R], lm[LM.CHIN], lm[LM.CHEEK_R], W, H)
  const jawAngle = (angL + angR) / 2

  return {
    faceLengthPx: faceLength, foreheadWidthPx: forehead, cheekboneWidthPx: cheek,
    jawWidthPx: jaw, jawAngleDeg: jawAngle,
    lengthRatio: faceLength / cheek, foreheadRatio: forehead / cheek, jawRatio: jaw / cheek,
  }
}

// Ideal feature signature per shape. h=lengthRatio, f=foreheadRatio,
// j=jawRatio, a=jawAngleDeg. Derived from face-shape morphology references.
interface Signature { h: number; f: number; j: number; a: number }
const SHAPE_SIGNATURE: Record<FaceShape, Signature> = {
  oval:    { h: 1.45, f: 0.88, j: 0.80, a: 128 },
  round:   { h: 1.08, f: 0.86, j: 0.86, a: 135 },
  square:  { h: 1.18, f: 0.93, j: 0.95, a: 112 },
  heart:   { h: 1.42, f: 0.96, j: 0.66, a: 122 },
  diamond: { h: 1.52, f: 0.74, j: 0.72, a: 126 },
  oblong:  { h: 1.75, f: 0.88, j: 0.84, a: 130 },
}

// Feature weights (jaw + forehead discriminate most; jaw angle is noisier from
// 2-D landmarks so it gets a smaller weight) and softmax temperature.
const FEATURE_W   = { h: 1.0, f: 1.3, j: 1.5, a: 0.6 } as const
const ANGLE_SCALE = 15          // normalise degrees to be comparable with ratios
const SOFTMAX_T   = 0.020

// Largest-remainder rounding → integers that sum to exactly `total`.
function roundToSum(values: number[], total: number): number[] {
  const floors = values.map(v => Math.floor(v))
  let remainder = total - floors.reduce((s, v) => s + v, 0)
  const order = values.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac)
  const out = [...floors]
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) out[order[k].i] += 1
  return out
}

/** Probability distribution over the 6 face shapes from measured geometry. */
export function classifyFaceShape(m: FaceMeasurements): FaceShapeAnalysis {
  const raw = FACE_SHAPES.map(shape => {
    const s = SHAPE_SIGNATURE[shape]
    const d =
      FEATURE_W.h * (m.lengthRatio   - s.h) ** 2 +
      FEATURE_W.f * (m.foreheadRatio - s.f) ** 2 +
      FEATURE_W.j * (m.jawRatio      - s.j) ** 2 +
      FEATURE_W.a * ((m.jawAngleDeg  - s.a) / ANGLE_SCALE) ** 2
    return Math.exp(-d / SOFTMAX_T)
  })
  const sum = raw.reduce((s, v) => s + v, 0) || 1
  const pct = roundToSum(raw.map(v => (v / sum) * 100), 100)

  const probabilities = {} as FaceShapeProbabilities
  FACE_SHAPES.forEach((s, i) => { probabilities[s] = pct[i] })

  const ranked = FACE_SHAPES
    .map((s, i) => ({ shape: s, probability: pct[i] }))
    .sort((a, b) => b.probability - a.probability)

  return { measurements: m, probabilities, ranked, top: ranked[0].shape, topProbability: ranked[0].probability }
}

/** Convenience: landmarks → full analysis, or null if not measurable. */
export function analyzeFaceLandmarks(lm: Pt[] | undefined, W: number, H: number): FaceShapeAnalysis | null {
  const m = measureFace(lm, W, H)
  return m ? classifyFaceShape(m) : null
}
