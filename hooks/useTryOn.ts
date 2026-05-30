'use client'

import { useState, useCallback, useRef } from 'react'
import type { TryOnState, TryOnStep } from '@/types'
import type { QcScore } from '@/lib/gemini/qcScore'
import { PRODUCT_MAP } from '@/constants/products'
import { detectColor, detectBrim, filterImagesByVariant, type BrimShape } from '@/lib/products/color'

const INIT: TryOnState = {
  step: 'idle',
  faceFile: null, faceUrl: null,
  hatFile: null,  hatUrl: null,
  faceResult: null,
  selectedSku: null,
  resultUrl: null,
  enhanced: false,
  renderMs: null,
  qc: null,
  errorMessage: null,
  isProcessing: false,
}

function nextStep(hasFace: boolean, hasHat: boolean): TryOnStep {
  if (hasFace && hasHat) return 'both-ready'
  if (hasFace) return 'face-ready'
  if (hasHat)  return 'hat-ready'
  return 'idle'
}

// Per spec (May 2026, revised): up to 4 attempts per click. We auto-retry
// BOTH on network/Gemini errors AND on QC verdict = fail. If every attempt's
// QC fails, we DON'T show an error — we surface the attempt with the highest
// QC total as a best-effort fallback (graceful degradation: user always gets
// SOMETHING usable, just flagged in the UI as "not above threshold").
const MAX_ATTEMPTS         = 4
const RETRY_DELAY_NETWORK  = 7000   // back-off for rate-limit / Gemini error
const RETRY_DELAY_QC       = 1000   // tighter — QC fails are not rate-limited

// ── Image payload limits ─────────────────────────────────────
// Keep the PERSON photo at full quality. Only downscale when the longest side
// exceeds 2048px; otherwise send the ORIGINAL file bytes (no resize, no
// recompress). Must stay in sync with MAX_DATAURL_CHARS in app/api/tryon/route.ts.
const PERSON_MAX_DIM      = 2048
const ORIGINAL_MAX_BYTES  = 10 * 1024 * 1024   // send original as-is up to ~10MB
const MAX_SEND_CHARS      = 15 * 1024 * 1024   // hard cap for the data URL we POST
const MAX_CAP_IMAGES      = 4                  // cap angles sent to Gemini per try-on


function getImageDims(file: File): Promise<{ width: number; height: number }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); res({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không đọc được kích thước ảnh')) }
    img.src = url
  })
}

// Read the ORIGINAL file bytes as a data URL — no canvas, no recompression.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload  = () => res(r.result as string)
    r.onerror = () => rej(new Error('Không đọc được file ảnh'))
    r.readAsDataURL(file)
  })
}

// Downscale to maxDim (longest side). Prefer PNG (lossless); fall back to
// high-quality JPEG (0.95) only if the PNG payload is too large to POST.
function scaleImageToDataUrl(
  file: File, maxDim: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const x = c.getContext('2d')
      if (!x) { rej(new Error('Canvas 2D unavailable')); return }
      x.drawImage(img, 0, 0, w, h)
      let dataUrl = c.toDataURL('image/png')                          // prefer PNG (lossless)
      if (dataUrl.length > MAX_SEND_CHARS) dataUrl = c.toDataURL('image/jpeg', 0.95)  // fallback
      res({ dataUrl, width: w, height: h })
    }
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Không load được ảnh')) }
    img.src = url
  })
}

interface PreparedImage {
  dataUrl:    string
  origWidth:  number
  origHeight: number
  sentWidth:  number
  sentHeight: number
  origBytes:  number
  mode:       string
}

// PERSON image: keep full quality. Original bytes when ≤2048px & ≤10MB,
// otherwise downscale to 2048 (PNG-first). NEVER JPEG-compress a small original.
async function preparePerson(file: File): Promise<PreparedImage> {
  const { width: ow, height: oh } = await getImageDims(file)
  const longest = Math.max(ow, oh)
  if (longest <= PERSON_MAX_DIM && file.size <= ORIGINAL_MAX_BYTES) {
    const dataUrl = await fileToDataUrl(file)
    return { dataUrl, origWidth: ow, origHeight: oh, sentWidth: ow, sentHeight: oh, origBytes: file.size, mode: 'original (no resize / no recompress)' }
  }
  const { dataUrl, width, height } = await scaleImageToDataUrl(file, PERSON_MAX_DIM)
  const mode = longest > PERSON_MAX_DIM ? `downscaled ${longest}px → ${PERSON_MAX_DIM}px (PNG-first)` : 'recompressed (original too large to send)'
  return { dataUrl, origWidth: ow, origHeight: oh, sentWidth: width, sentHeight: height, origBytes: file.size, mode }
}

const dataUrlKB = (d: string) => Math.round((d.length * 3 / 4) / 1024)   // base64 → bytes → KB

export function useTryOn() {
  const [state, setState] = useState<TryOnState>(INIT)
  const faceRef  = useRef<File | null>(null)
  const hatRef   = useRef<File | null>(null)
  const skuRef   = useRef<string | null>(null)
  const abortRef = useRef(false)

  const setFaceFile = useCallback((file: File) => {
    faceRef.current = file
    setState(prev => {
      if (prev.faceUrl) URL.revokeObjectURL(prev.faceUrl)
      return {
        ...prev,
        faceFile: file, faceUrl: URL.createObjectURL(file),
        step: nextStep(true, !!hatRef.current),
        faceResult: null, resultUrl: null, enhanced: false, renderMs: null, qc: null, errorMessage: null,
      }
    })
  }, [])

  const setHatFile = useCallback((file: File, sku?: string) => {
    hatRef.current = file
    if (sku) skuRef.current = sku
    setState(prev => {
      if (prev.hatUrl) URL.revokeObjectURL(prev.hatUrl)
      return {
        ...prev,
        hatFile: file, hatUrl: URL.createObjectURL(file),
        selectedSku: sku ?? prev.selectedSku,
        step: nextStep(!!faceRef.current, true),
        resultUrl: null, enhanced: false, renderMs: null, qc: null, errorMessage: null,
      }
    })
  }, [])

  // ── Generative try-on (Gemini multi-image, ChatGPT-style) ───
  //   1. Best-effort face-shape detection (for the recommendation card only)
  //   2. Send the selfie + cap image to Gemini → it re-renders the person
  //      wearing the cap with real fit / lighting / shadows
  //   No silent fallback — if Gemini fails, surface the error.
  const runTryOn = useCallback(async () => {
    const faceFile = faceRef.current
    const hatFile  = hatRef.current
    if (!faceFile || !hatFile) return

    abortRef.current = false
    setState(prev => ({
      ...prev,
      step: 'detecting', isProcessing: true, errorMessage: null,
      resultUrl: null, enhanced: false, renderMs: null, qc: null,
    }))

    // Step 1: best-effort face shape (never blocks generation)
    try {
      const { detectFace, fileToHTMLImage } = await import('@/lib/mediapipe/faceDetector')
      const img = await fileToHTMLImage(faceFile)
      const fr  = await detectFace(img)
      if (fr.detected) setState(prev => ({ ...prev, faceResult: fr }))
    } catch (e) {
      console.warn('[TryOn] face detect skipped:', e)
    }

    if (abortRef.current) return

    // Step 2: Gemini generative try-on
    try {
      setState(prev => ({ ...prev, step: 'processing' }))

      const person = await preparePerson(faceFile)     // full-quality person (no over-compression)
      if (abortRef.current) return

      // Cap references: send the product's image URLs (front/side/back/detail) and
      // let the SERVER fetch them. This is the key mobile fix — in-app browsers
      // (Messenger / iOS) fail at client-side cross-origin fetch + canvas, which
      // broke try-on there. Server-side fetch has no such limits. Only when there's
      // no product gallery do we fall back to sending the hat file itself as a data
      // URL (via FileReader — no canvas, reliable on mobile).
      const product = skuRef.current ? PRODUCT_MAP[skuRef.current] : null
      // Colour + brim lock: a single parent SKU often groups multiple variants
      // (TC67 has TRẮNG + ĐEN colourways AND NGANG + CONG brim shapes). Without
      // filtering, Gemini was picking the wrong colourway OR the wrong brim
      // from the multi-variant gallery. We detect both axes from the product
      // name and filter the gallery to the matching variant's image(s) only.
      //
      // Default brim when the parent name doesn't specify one: FLAT (NGANG) —
      // streetwear customers buying a snapback expect a flat brim by default,
      // and that matches the product owner's preference for TC67. Future: add
      // a variant picker UI that lets the user choose explicitly.
      const detectedColor = product ? detectColor(product.name) : null
      const detectedBrim: BrimShape = (product ? detectBrim(product.name) : null) ?? 'FLAT'
      const sourceImages = product
        ? filterImagesByVariant(product, detectedColor, detectedBrim)
        : []
      const garmentUrls = sourceImages
        .filter(u => /^https?:\/\//.test(u))
        .slice(0, MAX_CAP_IMAGES)
      const garments: string[] = garmentUrls.length ? [] : [await fileToDataUrl(hatFile)]
      if (abortRef.current) return

      console.log('[TryOn] PERSON original :', `${person.origWidth}×${person.origHeight}px`, `${(person.origBytes / 1024).toFixed(0)}KB`)
      console.log('[TryOn] PERSON sent     :', `${person.sentWidth}×${person.sentHeight}px`, `${dataUrlKB(person.dataUrl)}KB`, `(${person.mode})`)
      console.log('[TryOn] CAP references  :', garmentUrls.length ? `${garmentUrls.length} url(s) (server-fetched)` : '1 uploaded file')
      console.log('[TryOn] CAP colour-lock :', detectedColor ? `${detectedColor.vn} → ${detectedColor.en}` : 'none detected (no name colour token)')
      console.log('[TryOn] CAP brim-lock   :', `${detectedBrim} (${detectedBrim === 'FLAT' ? 'lưỡi ngang' : 'lưỡi cong'})`)

      type GeminiResp = {
        resultUrl?: string; error?: string; model?: string
        elapsedMs?: number; modelText?: string
        qc?: QcScore | null
        qcFailed?: boolean         // distinct from infra/Gemini errors — see below
      }
      let data: GeminiResp | null = null
      let lastErr = ''
      // Track the QC-failed attempt with the HIGHEST total — if every attempt
      // in the cycle fails QC, we surface this as the best-effort result
      // rather than an error. Only candidates that have a `qc` object can be
      // compared (an infra error has no scores → not a candidate).
      let bestFail: { resultUrl: string; qc: QcScore; elapsedMs?: number } | null = null

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (abortRef.current) return
        console.log(`[TryOn] ▶ Gemini try-on (attempt ${attempt}/${MAX_ATTEMPTS})`,
          { personKB: dataUrlKB(person.dataUrl), capRefs: garments.length })

        const tStart = Date.now()
        try {
          const res = await fetch('/api/tryon', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              person: person.dataUrl, garmentUrls, garments,
              personWidth: person.sentWidth, personHeight: person.sentHeight,
              productColor: detectedColor?.en ?? null,
              productName:  product?.name ?? null,
              productBrim:  detectedBrim,
            }),
          })
          const d = await res.json() as GeminiResp
          console.log('[TryOn] ◀ Gemini response', {
            attempt, ok: res.ok, http: res.status,
            backendMs: d.elapsedMs, roundTripMs: Date.now() - tStart,
            model: d.model, hasImage: !!d.resultUrl, modelText: d.modelText, error: d.error,
            qc: d.qc, qcFailed: d.qcFailed,
          })
          // QC verdict = fail: auto-regenerate (up to MAX_ATTEMPTS). Each fail
          // also competes for "best fallback" — we keep the highest-total
          // attempt in case every attempt fails.
          if (d.qcFailed) {
            lastErr = d.error || 'Ảnh tạo chưa đạt chất lượng mong muốn. Vui lòng thử lại.'
            if (d.resultUrl && d.qc && (!bestFail || d.qc.total > bestFail.qc.total)) {
              bestFail = { resultUrl: d.resultUrl, qc: d.qc, elapsedMs: d.elapsedMs }
              console.warn(`[TryOn] ⚠ QC fail attempt ${attempt}/${MAX_ATTEMPTS} (total=${d.qc.total}) — NEW best fallback`)
            } else {
              console.warn(`[TryOn] ⚠ QC fail attempt ${attempt}/${MAX_ATTEMPTS} (total=${d.qc?.total ?? '?'})`)
            }
            if (attempt < MAX_ATTEMPTS) {
              await new Promise(r => setTimeout(r, RETRY_DELAY_QC))
              continue
            }
            // Final attempt failed too — fall back to the best fail candidate.
            if (bestFail) {
              console.warn(`[TryOn] ⤵ all ${MAX_ATTEMPTS} attempts failed QC — using best-effort fallback (total=${bestFail.qc.total})`)
              data = {
                resultUrl: bestFail.resultUrl,
                qc:        bestFail.qc,
                elapsedMs: bestFail.elapsedMs,
              }
            } else {
              data = null
            }
            break
          }
          if (!res.ok || d.error || !d.resultUrl) throw new Error(d.error ?? `HTTP ${res.status}`)
          data = d
          break
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e)
          console.warn(`[TryOn] ✗ attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastErr}`)
          if (attempt < MAX_ATTEMPTS) {
            console.log(`[TryOn] ⏳ retry in ${RETRY_DELAY_NETWORK / 1000}s…`)
            await new Promise(r => setTimeout(r, RETRY_DELAY_NETWORK))
          }
        }
      }

      if (abortRef.current) return
      if (!data?.resultUrl) {
        throw new Error(lastErr || 'Gemini không trả về ảnh sau nhiều lần thử')
      }

      console.log(`[TryOn] ✓ Done — AI render ${data.elapsedMs}ms`)
      setState(prev => ({
        ...prev, step: 'done', isProcessing: false,
        resultUrl: data!.resultUrl!, enhanced: true, renderMs: data!.elapsedMs ?? null,
        qc: data!.qc ?? null,
      }))

    } catch (err) {
      if (abortRef.current) return
      const msg = err instanceof Error ? err.message : 'Gemini AI lỗi. Vui lòng thử lại.'
      console.error('[TryOn] ✗ Try-on aborted with error:', msg)
      setState(prev => ({
        ...prev, step: 'error', isProcessing: false, enhanced: false, renderMs: null, qc: null,
        errorMessage: msg,
      }))
    }
  }, [])

  const retry = useCallback(() => {
    abortRef.current = false
    runTryOn()
  }, [runTryOn])

  const reset = useCallback(() => {
    abortRef.current = true
    setState(prev => {
      if (prev.faceUrl) URL.revokeObjectURL(prev.faceUrl)
      if (prev.hatUrl)  URL.revokeObjectURL(prev.hatUrl)
      return INIT
    })
    faceRef.current = null
    hatRef.current  = null
    skuRef.current  = null
  }, [])

  const download = useCallback(() => {
    setState(prev => {
      if (!prev.resultUrl) return prev
      const a = document.createElement('a')
      a.href = prev.resultUrl
      if (prev.resultUrl.startsWith('http')) {
        window.open(prev.resultUrl, '_blank')
      } else {
        a.download = `tcaps-tryon-${Date.now()}.jpg`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
      }
      return prev
    })
  }, [])

  const share = useCallback(() => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const text = 'Xem mình thử nón TCAPS này nè! 🧢 #tcapsnonthoitrang'
    if (navigator.share) {
      navigator.share({ title: 'TCAPS Try-On', text, url }).catch(() => {})
    } else {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        '_blank'
      )
    }
  }, [])

  return {
    state, setFaceFile, setHatFile, runTryOn, retry, reset, download, share,
    canRun: !!state.faceFile && !!state.hatFile && !state.isProcessing,
  }
}
