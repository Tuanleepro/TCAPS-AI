'use client'

/**
 * Realistic Hat Compositor  v2
 *
 * Pipeline:
 *  A. Draw face → capture originalPixels (pre-hat snapshot)
 *  B. Sample skin tone + scene lighting from originalPixels
 *  C. Compute hat 4 corner-points with pose-aware perspective
 *  D. Draw depth pre-shadow (subtle hat-shape shadow under crown)
 *  E. Scanline perspective warp  ← true affine per strip, not CSS skew
 *  F. Restore hair layer         ← dark pixels above forehead OVER hat
 *  G. Projected brim shadow on forehead
 *  H. Contact AO at brim-ends (grounds hat to head)
 *  I. Scene lighting tint (colour-temperature integration)
 *  J. Export JPEG
 */

import type { FaceDetectionResult, HatAsset } from '@/types'

const DEG = Math.PI / 180

interface Pt { x: number; y: number }

// ─────────────────────────────────────────────────────────────
// Image loader — blob URL, no crossOrigin (same-origin blob)
// ─────────────────────────────────────────────────────────────
function loadBlob(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img  = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); res(img) }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error(`Cannot load ${file.name}`)) }
    img.src = url
  })
}

// ─────────────────────────────────────────────────────────────
// Sample skin luminance from raw pixel array (pre-hat snapshot)
// ─────────────────────────────────────────────────────────────
function sampleSkinLum(
  data: Uint8ClampedArray, W: number, H: number,
  noseTip: Pt, eyeL: Pt, eyeR: Pt,
): number {
  // Sample from nose bridge + inner cheeks — stable skin areas
  const probes: Pt[] = [
    noseTip,
    { x: (eyeL.x * 0.4 + noseTip.x * 0.6), y: (eyeL.y * 0.3 + noseTip.y * 0.7) },
    { x: (eyeR.x * 0.4 + noseTip.x * 0.6), y: (eyeR.y * 0.3 + noseTip.y * 0.7) },
  ]
  let sum = 0, n = 0
  for (const p of probes) {
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const px = (p.x + dx) | 0, py = (p.y + dy) | 0
        if (px < 0 || py < 0 || px >= W || py >= H) continue
        const i = (py * W + px) * 4
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        n++
      }
    }
  }
  return n > 0 ? sum / n / 255 : 0.6
}

// Sample scene lighting colour from original pixels (not canvas, avoids shadow taint)
function sampleSceneLight(
  data: Uint8ClampedArray, W: number, H: number,
  cx: number, foreheadY: number, hatW: number,
): { r: number; g: number; b: number; brightness: number } {
  const x0 = Math.max(0, (cx - hatW * 0.22) | 0)
  const y0 = Math.max(0, (foreheadY - hatW * 0.04) | 0)
  const x1 = Math.min(W, (cx + hatW * 0.22) | 0)
  const y1 = Math.min(H, (foreheadY + hatW * 0.06) | 0)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
    }
  }
  if (n === 0) return { r: 128, g: 128, b: 128, brightness: 0.5 }
  r /= n; g /= n; b /= n
  return { r, g, b, brightness: (0.299 * r + 0.587 * g + 0.114 * b) / 255 }
}

// ─────────────────────────────────────────────────────────────
// Compute 4 hat corner-points in image space,
// accounting for roll / yaw / pitch via perspective model.
// ─────────────────────────────────────────────────────────────
function computeHatCorners(
  face:   FaceDetectionResult,
  hat:    HatAsset,
  hatImg: HTMLImageElement,
): { tl: Pt; tr: Pt; bl: Pt; br: Pt; cx: number; cy: number; hatW: number; hatH: number } {
  const { keyPoints: kp, pose, headWidthPx: hw } = face

  const yawRad   = pose.yaw   * DEG
  const pitchRad = pose.pitch * DEG
  const rollRad  = pose.roll  * DEG

  // Base hat size (front-facing)
  const hatW = hw * hat.widthMultiplier
  const hatH = (hatImg.naturalHeight / hatImg.naturalWidth) * hatW

  const cx = (kp.templeLeft.x + kp.templeRight.x) / 2
  const cy = kp.foreheadTop.y - (hat.offsetYRatio - 0.5) * hatH

  // ── Yaw perspective ──────────────────────────────────────
  // cosY: total visible width fraction; sinY: depth-based offset fraction
  const cosY  = Math.cos(Math.abs(yawRad))
  const sinY  = Math.sin(Math.abs(yawRad))
  const yDir  = Math.sign(pose.yaw) || 1   // +1 = right, -1 = left

  // Near side stays close to full width; far side compresses
  const nearHalf = (hatW / 2) * (1 - sinY * 0.45)
  const farHalf  = Math.max(0, (hatW / 2) * cosY * 2 - nearHalf)

  // For rightward yaw: left side is far (compressed), right is near (wider)
  const leftHalf  = yDir >= 0 ? farHalf  : nearHalf
  const rightHalf = yDir >= 0 ? nearHalf : farHalf

  // ── Pitch: brim projects forward when looking down ────────
  // Looking down → bottom of hat shifts up slightly (brim hides)
  const brimShift = hatH * Math.sin(pitchRad) * 0.32

  const topY    = cy - hatH / 2
  const bottomY = cy + hatH / 2 + brimShift
  const leftX   = cx - leftHalf
  const rightX  = cx + rightHalf

  // ── Roll: rotate all corners around hat center ────────────
  const cosR = Math.cos(rollRad), sinR = Math.sin(rollRad)
  function rot(px: number, py: number): Pt {
    const dx = px - cx, dy = py - cy
    return { x: cx + dx * cosR - dy * sinR, y: cy + dx * sinR + dy * cosR }
  }

  return {
    tl: rot(leftX,  topY),
    tr: rot(rightX, topY),
    bl: rot(leftX,  bottomY),
    br: rot(rightX, bottomY),
    cx, cy, hatW, hatH,
  }
}

// ─────────────────────────────────────────────────────────────
// Scanline perspective warp
// Divides hat into `strips` horizontal bands; each band is drawn
// as an affine-transformed parallelogram → correct 3-D perspective.
// ─────────────────────────────────────────────────────────────
function drawHatScanline(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  tl: Pt, tr: Pt, bl: Pt, br: Pt,
  strips = 60,
) {
  const iW = img.naturalWidth
  const iH = img.naturalHeight

  function lerp(a: Pt, b: Pt, t: number): Pt {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  }

  // Overlap adjacent strips by half a strip so the clipped affine bands meet
  // without sub-pixel gaps (kills the faint horizontal banding on the hat).
  const ovT = 0.5 / strips

  for (let i = 0; i < strips; i++) {
    const t0   = i / strips
    const t1   = (i + 1) / strips
    const srcY = t0 * iH
    const srcH = iH / strips

    // Geometry uses the nominal strip; the bottom edge is extended for the
    // clip + draw so this strip paints a hair past its boundary into the next.
    const t1e   = Math.min(1, t1 + ovT)
    const srcHd = Math.min(iH - srcY, srcH + ovT * iH)

    const dTL  = lerp(tl, bl, t0)
    const dTR  = lerp(tr, br, t0)
    const dBLe = lerp(tl, bl, t1e)
    const dBRe = lerp(tr, br, t1e)
    const dBL  = lerp(tl, bl, t1)   // nominal bottom → drives the affine scale

    // Affine that maps: (0, srcY) → dTL  |  (iW, srcY) → dTR  |  (0, srcY+srcH) → dBL
    const a = (dTR.x - dTL.x) / iW
    const b = (dTR.y - dTL.y) / iW
    const c = (dBL.x - dTL.x) / srcH
    const d = (dBL.y - dTL.y) / srcH
    const e = dTL.x - c * srcY
    const f = dTL.y - d * srcY

    ctx.save()
    // Clip to the (bottom-extended) parallelogram for this strip
    ctx.beginPath()
    ctx.moveTo(dTL.x, dTL.y)
    ctx.lineTo(dTR.x, dTR.y)
    ctx.lineTo(dBRe.x, dBRe.y)
    ctx.lineTo(dBLe.x, dBLe.y)
    ctx.closePath()
    ctx.clip()
    ctx.transform(a, b, c, d, e, f)
    ctx.drawImage(img, 0, srcY, iW, srcHd, 0, srcY, iW, srcHd)
    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────
// Hair restoration
// Pixels from the pre-hat snapshot that are:
//   • inside the hat bounding box
//   • within the zone from hat-top to ~foreheadY + margin
//   • significantly darker than skin (= hair)
// are painted BACK over the hat so hair appears IN FRONT.
// ─────────────────────────────────────────────────────────────
function restoreHairLayer(
  ctx:      CanvasRenderingContext2D,
  origPx:   Uint8ClampedArray,
  W: number, H: number,
  tl: Pt, tr: Pt, bl: Pt, br: Pt,
  foreheadY: number,
  skinLum:   number,          // 0–1
) {
  // Restore hair ONLY in a thin fringe at the hat's front-bottom edge — never
  // the crown. The cap sits on top of the hair, so restoring the crown region
  // (as the old code did) repaints dark hair/background over the hat and erases
  // it on dark-haired subjects. The crown + logo must stay untouched.
  const hatTop    = Math.min(tl.y, tr.y)
  const hatBottom = Math.max(bl.y, br.y)
  const hatH      = Math.max(1, hatBottom - hatTop)
  const xL        = Math.min(tl.x, bl.x)
  const xR        = Math.max(tr.x, br.x)
  const wSpan     = Math.max(1, xR - xL)

  const rx0  = Math.max(0, Math.floor(xL + wSpan * 0.10))     // most of the front width
  const rx1  = Math.min(W, Math.ceil(xR - wSpan * 0.10))
  const ry0  = Math.max(0, Math.floor(hatBottom - hatH * 0.24)) // front fringe band
  const ry1  = Math.min(H, Math.ceil(hatBottom + 1))

  if (ry1 <= ry0 || rx1 <= rx0) return

  const rW   = rx1 - rx0
  const rH   = ry1 - ry0
  const comp = ctx.getImageData(rx0, ry0, rW, rH)
  const cpx  = comp.data

  // Hair threshold: darker than skinLum * 0.70
  const hairThreshLum = skinLum * 0.70 * 255

  for (let y = ry0; y < ry1; y++) {
    for (let x = rx0; x < rx1; x++) {
      const oi = (y * W + x) * 4
      const oR = origPx[oi], oG = origPx[oi + 1], oB = origPx[oi + 2], oA = origPx[oi + 3]
      if (oA < 128) continue                         // transparent in original → skip

      const lum = 0.299 * oR + 0.587 * oG + 0.114 * oB
      if (lum >= hairThreshLum) continue             // not dark enough → not hair

      // Blend strength: stronger the darker relative to skin (capped low so a
      // hair fringe softens the edge without erasing hat pixels)
      const strength = Math.min(1,
        (hairThreshLum - lum) / Math.max(1, skinLum * 0.35 * 255)
      ) * 0.68

      const ci = ((y - ry0) * rW + (x - rx0)) * 4
      cpx[ci]     = oR * strength + cpx[ci]     * (1 - strength)
      cpx[ci + 1] = oG * strength + cpx[ci + 1] * (1 - strength)
      cpx[ci + 2] = oB * strength + cpx[ci + 2] * (1 - strength)
      // alpha stays as-is (the face is already fully opaque)
    }
  }

  ctx.putImageData(comp, rx0, ry0)
}

// ─────────────────────────────────────────────────────────────
// Pre-shadow: subtle blurred hat-shape under crown
// (adds depth before hat is rendered)
// ─────────────────────────────────────────────────────────────
function drawPreShadow(
  ctx: CanvasRenderingContext2D,
  tl: Pt, tr: Pt, bl: Pt, br: Pt,
  hatW: number,
) {
  ctx.save()
  const exp = hatW * 0.025
  ctx.filter    = `blur(${hatW * 0.04}px)`
  ctx.fillStyle = 'rgba(0,0,0,0.20)'
  ctx.beginPath()
  ctx.moveTo(tl.x - exp, tl.y)
  ctx.lineTo(tr.x + exp, tr.y)
  ctx.lineTo(br.x + exp, br.y + exp)
  ctx.lineTo(bl.x - exp, bl.y + exp)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────
// Projected brim shadow: gradient below the brim onto face
// ─────────────────────────────────────────────────────────────
function drawBrimShadow(
  ctx: CanvasRenderingContext2D,
  bl: Pt, br: Pt,
  cx: number, hatW: number,
  yawDeg: number,
) {
  const shift  = yawDeg * 0.7           // shadow shifts with yaw
  const y0     = (bl.y + br.y) / 2
  const x0     = bl.x - hatW * 0.05
  const x1     = br.x + hatW * 0.05

  // (1) Soft projected shadow cast onto the forehead
  ctx.save()
  const depth = hatW * 0.15
  const grad = ctx.createLinearGradient(cx + shift * 0.3, y0, cx + shift, y0 + depth)
  grad.addColorStop(0,    'rgba(0,0,0,0.40)')
  grad.addColorStop(0.4,  'rgba(0,0,0,0.16)')
  grad.addColorStop(1,    'rgba(0,0,0,0.00)')
  ctx.filter    = `blur(${hatW * 0.022}px)`
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(x0,               bl.y)
  ctx.lineTo(x1,               br.y)
  ctx.lineTo(x1 + hatW * 0.03, br.y + depth)
  ctx.lineTo(x0 - hatW * 0.03, bl.y + depth)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // (2) Tight dark core hugging the brim edge → gives the brim real depth
  ctx.save()
  const core  = hatW * 0.055
  const cgrad = ctx.createLinearGradient(cx, y0, cx, y0 + core)
  cgrad.addColorStop(0, 'rgba(0,0,0,0.55)')
  cgrad.addColorStop(1, 'rgba(0,0,0,0.00)')
  ctx.filter    = `blur(${hatW * 0.01}px)`
  ctx.fillStyle = cgrad
  ctx.beginPath()
  ctx.moveTo(x0, bl.y)
  ctx.lineTo(x1, br.y)
  ctx.lineTo(x1, br.y + core)
  ctx.lineTo(x0, bl.y + core)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────
// Contact AO: radial dark spots where brim ends meet head
// Visually "glues" the hat to the head.
// ─────────────────────────────────────────────────────────────
function drawContactAO(
  ctx: CanvasRenderingContext2D,
  bl: Pt, br: Pt, hatW: number,
) {
  const r = hatW * 0.16
  for (const p of [bl, br]) {
    ctx.save()
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
    g.addColorStop(0,   'rgba(0,0,0,0.30)')
    g.addColorStop(0.45,'rgba(0,0,0,0.12)')
    g.addColorStop(1,   'rgba(0,0,0,0.00)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// ─────────────────────────────────────────────────────────────
// Scene lighting tint: multiply scene colour over hat region
// Makes the hat "belong" to the same light environment as face
// ─────────────────────────────────────────────────────────────
function applyLightingTint(
  ctx: CanvasRenderingContext2D,
  tl: Pt, tr: Pt, bl: Pt, br: Pt,
  light: { r: number; g: number; b: number; brightness: number },
) {
  if (light.brightness < 0.12) return
  const alpha = (light.brightness - 0.12) * 0.10
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = `rgba(${light.r | 0},${light.g | 0},${light.b | 0},${alpha.toFixed(3)})`
  ctx.beginPath()
  ctx.moveTo(tl.x, tl.y)
  ctx.lineTo(tr.x, tr.y)
  ctx.lineTo(br.x, br.y)
  ctx.lineTo(bl.x, bl.y)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────
// Protect-mask for the AI relight pass.
//
// White  = region the inpaint model MAY repaint (the contact seam around the
//          hat outline + the brim-shadow band on the forehead).
// Black  = protected, never regenerated → hat interior (logo / embroidery),
//          face and hair stay pixel-identical to the composite.
//
// Returned as its own JPEG dataURL, same dimensions as the composite.
// ─────────────────────────────────────────────────────────────
function buildSeamMask(
  W: number, H: number,
  tl: Pt, tr: Pt, bl: Pt, br: Pt,
  hatW: number,
): string {
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const m = c.getContext('2d')
  if (!m) return ''

  // Base: fully protected
  m.fillStyle = '#000'
  m.fillRect(0, 0, W, H)

  m.fillStyle   = '#fff'
  m.strokeStyle = '#fff'
  m.lineJoin    = 'round'
  m.lineCap     = 'round'

  // 1. Contact seam: stroke the hat outline with a thick band so the model can
  //    blend the hat edge into hair/skin (band straddles the outline; the hat
  //    interior remains black → logo untouched).
  m.lineWidth = Math.max(8, hatW * 0.10)
  m.beginPath()
  m.moveTo(tl.x, tl.y)
  m.lineTo(tr.x, tr.y)
  m.lineTo(br.x, br.y)
  m.lineTo(bl.x, bl.y)
  m.closePath()
  m.stroke()

  // 2. Brim-shadow band cast onto the forehead (lets the model paint a realistic
  //    contact shadow under the brim).
  const depth = hatW * 0.20
  m.beginPath()
  m.moveTo(bl.x - hatW * 0.05, bl.y)
  m.lineTo(br.x + hatW * 0.05, br.y)
  m.lineTo(br.x + hatW * 0.05, br.y + depth)
  m.lineTo(bl.x - hatW * 0.05, bl.y + depth)
  m.closePath()
  m.fill()

  // Soft edges → smoother inpaint transition. Re-flatten onto black so the blur
  // halo never leaks transparency.
  const soft = document.createElement('canvas')
  soft.width = W; soft.height = H
  const s = soft.getContext('2d')
  if (s) {
    s.fillStyle = '#000'
    s.fillRect(0, 0, W, H)
    s.filter = `blur(${Math.max(2, hatW * 0.022)}px)`   // feather → natural edge
    s.drawImage(c, 0, 0)
    return soft.toDataURL('image/jpeg', 0.9)
  }
  return c.toDataURL('image/jpeg', 0.9)
}

export interface CompositeResult {
  /** Composited image (face + exact hat pixels). dataURL JPEG. */
  url:  string
  /** Seam/shadow protect-mask (white = blendable band). dataURL JPEG. */
  mask: string
  /** Full hat silhouette (white = hat). dataURL JPEG — region for lighting transfer. */
  hatMask: string
}

// ─────────────────────────────────────────────────────────────
// Realism merge with HARD product lock
//
// The flat "PNG overlay" look comes from the hat body keeping its raw
// composite pixels. We fix that WITHOUT repainting the product:
//
//   • Hat body (hatMask): low-frequency LUMINANCE transfer from the AI —
//     multiply composite by a smooth, clamped brightness ratio. This bakes
//     the scene's lighting/shadow/depth onto the cap while preserving its
//     exact colour, logo, embroidery and brim shape (only value changes,
//     not content — this is relight, not repaint).
//   • Seam band (mask): blend the AI's RGB directly for natural hair↔hat
//     edges + contact shadow.
//   • Grain matching: add noise sized to the photo's own grain so the cap
//     doesn't look "cut out".
//
// Gemini returns a same-origin dataURL (untainted); a cross-origin URL that
// taints the canvas makes getImageData throw and the caller surfaces it.
// ─────────────────────────────────────────────────────────────
function loadAnyImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous'
    img.onload  = () => res(img)
    img.onerror = () => rej(new Error('Cannot load image for merge'))
    img.src = src
  })
}

export interface LockOptions {
  /** AI RGB blend strength inside the seam band (0–1). */
  seamStrength?:  number
  /** Lighting-transfer strength on the hat body (0–1). */
  lightStrength?: number
  /** Match the photo's film grain over the hat. */
  grain?:         boolean
}

export async function lockHatPixels(
  compositeUrl: string,
  aiUrl:        string,
  maskUrl:      string,
  hatMaskUrl:   string,
  opts: LockOptions = {},
): Promise<string> {
  const seamStrength  = opts.seamStrength  ?? 0.55
  const lightStrength = opts.lightStrength ?? 0.7
  const useGrain      = opts.grain         ?? true

  const [comp, ai, mask, hatM] = await Promise.all([
    loadAnyImage(compositeUrl),
    loadAnyImage(aiUrl),
    loadAnyImage(maskUrl),
    loadAnyImage(hatMaskUrl),
  ])

  const W = comp.naturalWidth
  const H = comp.naturalHeight
  const ctxOf = (draw: (x: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const x = c.getContext('2d', { willReadFrequently: true })!
    draw(x)
    return x
  }
  const lum = (d: Uint8ClampedArray, i: number) =>
    0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]

  const cx = ctxOf(x => x.drawImage(comp, 0, 0, W, H))
  const Cimg = cx.getImageData(0, 0, W, H)
  const C = Cimg.data

  const A  = ctxOf(x => x.drawImage(ai,   0, 0, W, H)).getImageData(0, 0, W, H).data
  const M  = ctxOf(x => x.drawImage(mask, 0, 0, W, H)).getImageData(0, 0, W, H).data
  const HM = ctxOf(x => x.drawImage(hatM, 0, 0, W, H)).getImageData(0, 0, W, H).data

  // Blurred versions → transfer Gemini's lighting + form-shading. A medium blur
  // (not too fine) lets cap curvature/shadow depth through while keeping the
  // logo's fine detail out of the ratio (so text/edges stay from the composite).
  const rb = Math.max(5, Math.round(W * 0.015))
  const CB = ctxOf(x => { x.filter = `blur(${rb}px)`; x.drawImage(comp, 0, 0, W, H) }).getImageData(0, 0, W, H).data
  const AB = ctxOf(x => { x.filter = `blur(${rb}px)`; x.drawImage(ai,   0, 0, W, H) }).getImageData(0, 0, W, H).data

  // Grain magnitude from the composite's own high-frequency energy.
  let grainSigma = 0
  if (useGrain) {
    const CSB = ctxOf(x => { x.filter = 'blur(1.5px)'; x.drawImage(comp, 0, 0, W, H) }).getImageData(0, 0, W, H).data
    let acc = 0, n = 0
    for (let i = 0; i < C.length; i += 4 * 37) {       // sparse sample
      acc += Math.abs(lum(C, i) - lum(CSB, i)); n++
    }
    grainSigma = Math.min(2.5, (acc / Math.max(1, n)) * 0.7)   // subtle — never roughen the logo
  }

  // Box–Muller gaussian
  let cached = NaN
  const gauss = () => {
    if (!Number.isNaN(cached)) { const v = cached; cached = NaN; return v }
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    const r = Math.sqrt(-2 * Math.log(u))
    cached = r * Math.sin(2 * Math.PI * v)
    return r * Math.cos(2 * Math.PI * v)
  }
  const clamp = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : n)

  for (let i = 0; i < C.length; i += 4) {
    let r = C[i], g = C[i + 1], b = C[i + 2]

    const hm = (0.299 * HM[i] + 0.587 * HM[i + 1] + 0.114 * HM[i + 2]) / 255
    if (hm > 0.4) {
      // Relight: multiply by smooth, clamped brightness ratio (no content change)
      const lc = lum(CB, i), la = lum(AB, i)
      let ratio = la / Math.max(4, lc)
      ratio = Math.max(0.55, Math.min(1.7, ratio))    // allow real shadows + highlights
      ratio = 1 + (ratio - 1) * lightStrength
      r *= ratio; g *= ratio; b *= ratio
      if (grainSigma > 0) { const nz = gauss() * grainSigma; r += nz; g += nz; b += nz }
    }

    const sm = (0.299 * M[i] + 0.587 * M[i + 1] + 0.114 * M[i + 2]) / 255
    if (sm > 0.04) {
      const w = sm * seamStrength               // blend AI at the hair↔hat seam
      r = r * (1 - w) + A[i]     * w
      g = g * (1 - w) + A[i + 1] * w
      b = b * (1 - w) + A[i + 2] * w
    }

    C[i] = clamp(r); C[i + 1] = clamp(g); C[i + 2] = clamp(b)
  }

  cx.putImageData(Cimg, 0, 0)
  return cx.canvas.toDataURL('image/jpeg', 0.95)
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────
export async function compositeHat(
  faceFile: File,
  hatFile:  File,
  face:     FaceDetectionResult,
  hat:      HatAsset,
): Promise<CompositeResult> {
  if (!face.detected)         throw new Error('No face detected')
  if (face.headWidthPx < 10) throw new Error('Head too small — move closer')

  // Load both images in parallel
  const [faceImg, hatImg] = await Promise.all([
    loadBlob(faceFile),
    loadBlob(hatFile),
  ])

  const W = face.imageWidth
  const H = face.imageHeight

  const canvas  = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  // ── A. Draw face ─────────────────────────────────────────
  ctx.drawImage(faceImg, 0, 0, W, H)

  // ── B. Capture original pixels BEFORE hat is drawn ───────
  //    (used for hair restoration + scene light sampling)
  const origPx = ctx.getImageData(0, 0, W, H).data

  // ── C. Measure skin tone + scene lighting ─────────────────
  const { keyPoints: kp } = face
  const skinLum = sampleSkinLum(origPx, W, H, kp.noseTip, kp.eyeLeft, kp.eyeRight)
  const corners = computeHatCorners(face, hat, hatImg)
  const { tl, tr, bl, br, cx, cy, hatW, hatH } = corners

  // Scene light sampled from original pixels — not affected by shadows yet
  const light = sampleSceneLight(origPx, W, H, cx, kp.foreheadTop.y, hatW)

  console.log('[Compositor] pose:', {
    roll: face.pose.roll.toFixed(1)+'°',
    yaw:  face.pose.yaw.toFixed(1)+'°',
    pitch:face.pose.pitch.toFixed(1)+'°',
  })
  console.log('[Compositor] hat corners:',
    `tl(${tl.x|0},${tl.y|0}) tr(${tr.x|0},${tr.y|0}) bl(${bl.x|0},${bl.y|0}) br(${br.x|0},${br.y|0})`
  )
  console.log('[Compositor] skinLum:', skinLum.toFixed(2), '| light:', light.brightness.toFixed(2))

  // ── D. Pre-shadow under crown ─────────────────────────────
  drawPreShadow(ctx, tl, tr, bl, br, hatW)

  // ── E. Draw hat with scanline perspective warp ────────────
  drawHatScanline(ctx, hatImg, tl, tr, bl, br)

  // ── F. Restore hair on top of hat ─────────────────────────
  restoreHairLayer(ctx, origPx, W, H, tl, tr, bl, br, kp.foreheadTop.y, skinLum)

  // ── G. Projected brim shadow ──────────────────────────────
  drawBrimShadow(ctx, bl, br, cx, hatW, face.pose.yaw)

  // ── H. Contact AO at brim ends ────────────────────────────
  drawContactAO(ctx, bl, br, hatW)

  // ── I. Scene lighting tint ────────────────────────────────
  applyLightingTint(ctx, tl, tr, bl, br, light)

  // ── J. Hat silhouette mask (white = hat) — region for AI lighting transfer ──
  const silCanvas  = document.createElement('canvas')
  silCanvas.width  = W
  silCanvas.height = H
  const sil = silCanvas.getContext('2d', { willReadFrequently: true })
  let hatMask = ''
  if (sil) {
    drawHatScanline(sil, hatImg, tl, tr, bl, br)   // draw hat with its alpha
    const sImg = sil.getImageData(0, 0, W, H)
    const sd   = sImg.data
    for (let i = 0; i < sd.length; i += 4) {
      const v = sd[i + 3] > 28 ? 255 : 0           // alpha → white silhouette
      sd[i] = v; sd[i + 1] = v; sd[i + 2] = v; sd[i + 3] = 255
    }
    sil.putImageData(sImg, 0, 0)
    hatMask = silCanvas.toDataURL('image/jpeg', 0.9)
  }

  // ── K. Export composite + masks ───────────────────────────
  const out  = canvas.toDataURL('image/jpeg', 0.96)
  const mask = buildSeamMask(W, H, tl, tr, bl, br, hatW)
  console.log('[Compositor] output:', (out.length / 1024).toFixed(0) + 'KB')
  return { url: out, mask, hatMask }
}
