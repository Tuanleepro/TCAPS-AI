// ─────────────────────────────────────────────────────────────────────────────
// TCAPS Recommendation Engine
//
// Compatibility score + explanation between a detected face shape and a product.
// Pure + deterministic — NO random, NO hardcoded result. Every number is
// traceable to: (a) the user's measured face shape (from lib/face-analysis), and
// (b) the product's metadata (form derived from style, declared face shapes,
// badge/tags). If the product has NO usable metadata, scoreCompatibility returns
// null → the UI shows "Chưa đủ dữ liệu" instead of a fabricated %.
//
// Face-shape DETECTION lives in lib/face-analysis.ts (this file only scores fit).
// ─────────────────────────────────────────────────────────────────────────────

import type { FaceShape } from '@/types'
import type { Product } from '@/constants/products'

// Final compatibility = weighted sum of three components (weights sum to 1).
export const SCORE_WEIGHTS = { faceShape: 0.70, style: 0.20, product: 0.10 } as const

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))

// Customer-facing floor (business rule): the lowest compatibility ever shown is
// MIN_COMPATIBILITY%. The raw 0–100 score is rescaled into [MIN,100] — a
// monotonic transform, so it never reorders hats and the differentiation of the
// real, data-derived score is fully preserved (display is still traceable to it).
export const MIN_COMPATIBILITY = 80
export const toDisplayScore = (raw: number) =>
  Math.round(MIN_COMPATIBILITY + clamp(raw) * (100 - MIN_COMPATIBILITY) / 100)

type Crown    = 'low' | 'medium' | 'high'
type Brim     = 'flat' | 'curved'
type StyleKey = 'snapback' | 'trucker' | 'fitted'

const CROWN_LABEL: Record<Crown, string> = { low: 'thấp', medium: 'trung bình', high: 'cao' }
const BRIM_LABEL:  Record<Brim, string>  = { flat: 'phẳng', curved: 'cong' }

interface HatForm { styleKey: StyleKey; crown: Crown; brim: Brim }

// Derive the cap's form from its style metadata / name keywords. Returns null
// when nothing recognisable is present (→ form is NOT known → not traceable).
function formFromProduct(p: Product): HatForm | null {
  const s = `${p.style ?? ''} ${p.line ?? ''} ${p.name ?? ''}`.toLowerCase()
  if (/trucker|lưới|luoi|mesh/.test(s)) return { styleKey: 'trucker',  crown: 'high',   brim: 'flat' }
  if (/fitted/.test(s))                 return { styleKey: 'fitted',   crown: 'low',    brim: 'curved' }
  if (/snapback/.test(s))               return { styleKey: 'snapback', crown: 'medium', brim: 'flat' }
  return null
}

interface ShapeRule { label: string; preferred: StyleKey[]; avoid: StyleKey[]; crown?: Crown; curvedBrim: boolean }
const FACE_RULES: Record<FaceShape, ShapeRule> = {
  oval:    { label: 'Oval',      preferred: ['snapback', 'trucker', 'fitted'], avoid: [],          curvedBrim: false },
  round:   { label: 'Tròn',      preferred: ['trucker'],                       avoid: ['fitted'],  crown: 'high', curvedBrim: false },
  square:  { label: 'Vuông',     preferred: ['fitted', 'snapback'],            avoid: [],          curvedBrim: true },
  heart:   { label: 'Tim',       preferred: ['fitted', 'snapback'],            avoid: [],          curvedBrim: true },
  diamond: { label: 'Kim Cương', preferred: ['snapback', 'trucker'],           avoid: [],          curvedBrim: false },
  oblong:  { label: 'Dài',       preferred: ['fitted'],                        avoid: ['trucker'], crown: 'low', curvedBrim: true },
}

export const FACE_SHAPE_LABEL = (s: FaceShape) => FACE_RULES[s].label

type ShapeSource = 'metadata' | 'style-rule'
interface SupportInfo { shapes: FaceShape[]; source: ShapeSource }

// Which face shapes does this product suit, and where does that fact come from?
//  • metadata   → product.faceShapes was explicitly curated.
//  • style-rule → derived from the cap's form (style preferred per face shape).
// Returns null when neither source has data (→ not computable).
function supportedShapes(p: Product, form: HatForm | null): SupportInfo | null {
  const declared = p.faceShapes ?? []
  if (declared.length > 0) return { shapes: declared, source: 'metadata' }
  if (form) {
    const shapes = (Object.keys(FACE_RULES) as FaceShape[])
      .filter(sh => FACE_RULES[sh].preferred.includes(form.styleKey))
    if (shapes.length > 0) return { shapes, source: 'style-rule' }
  }
  return null
}

// — Component A: face-shape match (0–100) — does the cap suit THIS face shape? —
function faceShapeMatchScore(p: Product, shape: FaceShape, support: SupportInfo): number {
  if ((p.topFor ?? []).includes(shape)) return 100
  if (support.source === 'metadata')    return support.shapes.includes(shape) ? 90 : 40
  // style-rule
  return support.shapes.includes(shape) ? 82 : 45
}

// — Component B: style match (0–100) — style category + brim vs face-shape rule —
function styleMatchScore(shape: FaceShape, form: HatForm | null): number {
  if (!form) return 60                          // form unknown → neutral
  const rule = FACE_RULES[shape]
  let s: number
  if (rule.preferred.includes(form.styleKey))  s = 90
  else if (rule.avoid.includes(form.styleKey)) s = 34
  else                                         s = 62
  if (rule.curvedBrim && form.brim === 'curved') s += 6
  if (!rule.curvedBrim && form.brim === 'flat')  s += 4
  return clamp(s)
}

// — Component C: product weight (0–100) — popularity signal from metadata —
function productWeightScore(p: Product): number {
  let s: number
  switch (p.badge) {
    case 'BEST SELLER': s = 100; break
    case 'TRENDING':    s = 92;  break
    case 'ICONIC':      s = 88;  break
    case 'NEW':         s = 74;  break
    default:            s = 62
  }
  const tags = p.tags ?? []
  if (tags.includes('bestseller'))                         s = Math.max(s, 96)
  if (tags.includes('premium') || tags.includes('iconic')) s += 4
  if (typeof p.stock === 'number' && p.stock <= 0)         s -= 6
  return clamp(s)
}

export interface CompatibilityResult {
  score:          number       // 80–100 — DISPLAYED (rawScore rescaled to floor)
  rawScore:       number       // 0–100  — raw weighted sum (for the breakdown)
  faceShapeMatch: number       // 0–100
  styleMatch:     number       // 0–100
  productWeight:  number       // 0–100
  supportedShapes: FaceShape[] // shapes the cap suits
  supportSource:  ShapeSource  // where supportedShapes came from
  form:           HatForm | null
  explanation:    string       // factual, data-grounded (no marketing)
}

// Returns null when the product has NO usable metadata (no declared face shapes
// AND no recognisable form) → caller must show "Chưa đủ dữ liệu".
export function scoreCompatibility(product: Product, shape: FaceShape): CompatibilityResult | null {
  const form    = formFromProduct(product)
  const support = supportedShapes(product, form)
  if (!support) return null

  const faceShapeMatch = faceShapeMatchScore(product, shape, support)
  const styleMatch     = styleMatchScore(shape, form)
  const productWeight  = productWeightScore(product)

  const rawScore = clamp(Math.round(
    SCORE_WEIGHTS.faceShape * faceShapeMatch +
    SCORE_WEIGHTS.style     * styleMatch +
    SCORE_WEIGHTS.product   * productWeight,
  ))
  const score = toDisplayScore(rawScore)   // floor at MIN_COMPATIBILITY%

  return {
    score, rawScore, faceShapeMatch, styleMatch, productWeight,
    supportedShapes: support.shapes, supportSource: support.source, form,
    explanation: buildExplanation(product, shape, form, support),
  }
}

// ── Highest-compatibility recommendations ────────────────────────────────────
// Score EVERY product against the measured face shape, drop the ones with no
// usable metadata, and return the best fits (most-compatible first). Used to
// offer the customer more choices beyond the cap they're currently trying on.
export interface Recommendation { product: Product; compat: CompatibilityResult }
export function rankCompatibility(
  products: Product[],
  shape: FaceShape,
  opts: { excludeSku?: string; limit?: number } = {},
): Recommendation[] {
  const { excludeSku, limit = 4 } = opts
  return products
    .filter(p => p.sku !== excludeSku && (p.imageUrl || (p.images?.length ?? 0) > 0))
    .map(p => ({ product: p, compat: scoreCompatibility(p, shape) }))
    .filter((r): r is Recommendation => r.compat !== null)
    .sort((a, b) => b.compat.rawScore - a.compat.rawScore)
    .slice(0, Math.max(0, limit))
}

// Factual explanation citing the exact data used — never marketing/speculation.
function buildExplanation(p: Product, shape: FaceShape, form: HatForm | null, support: SupportInfo): string {
  const me = FACE_RULES[shape].label
  const supList = support.shapes.map(s => FACE_RULES[s].label).join(', ')
  const inGroup = support.shapes.includes(shape)

  const cls = p.style
    ? (form
        ? `${p.name} được phân loại là ${p.style} cap (crown ${CROWN_LABEL[form.crown]}, vành ${BRIM_LABEL[form.brim]}).`
        : `${p.name} được phân loại là ${p.style} cap.`)
    : `${p.name}.`

  const sourcePart = support.source === 'metadata'
    ? `Theo metadata sản phẩm, form này phù hợp nhóm khuôn mặt: ${supList}.`
    : `Theo form nón, kiểu này thường phù hợp nhóm khuôn mặt: ${supList}.`

  const verdict = inGroup
    ? `Khuôn mặt ${me} của bạn nằm trong nhóm này → độ phù hợp cao.`
    : `Khuôn mặt ${me} của bạn không thuộc nhóm này → độ phù hợp thấp hơn.`

  return `${cls} ${sourcePart} ${verdict}`
}
