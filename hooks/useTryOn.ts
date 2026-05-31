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

// Gemini can hiccup (rate-limit, or returns text instead of an image). Auto-retry
// the call a few times before surfacing an error — retry, not silent fallback.
const MAX_ATTEMPTS   = 3
const RETRY_DELAY_MS = 7000

// ── Image payload limits ─────────────────────────────────────
// Keep the PERSON photo at full quality. Only downscale when the longest side
// exceeds 2048px; otherwise send the ORIGINAL file bytes (no resize, no
// recompress). Must stay in sync with MAX_DATAURL_CHARS in app/api/tryon/route.ts.
const PERSON_MAX_DIM      = 2048
const ORIGINAL_MAX_BYTES  = 10 * 1024 * 1024   // send original as-is up to ~10MB
const MAX_SEND_CHARS      = 15 * 1024 * 1024   // hard cap for the data URL we POST
const MAX_CAP_IMAGES      = 6                  // cap angles sent to Gemini per try-on (bumped 4→6 after owner added multi-angle photos in Pancake)


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
  const faceRef     = useRef<File | null>(null)
  const hatRef      = useRef<File | null>(null)
  const skuRef      = useRef<string | null>(null)
  // Variant identifier (variant.sku or variant.name) set when the customer
  // came from /product/[sku] with `&v=` — we then pin garmentUrls to ONLY
  // that variant's image so Gemini doesn't pull the parent thumbnail or a
  // sibling variant and render the wrong cap.
  const variantRef  = useRef<string | null>(null)
  const abortRef    = useRef(false)
  // Live mirror of state so callbacks (e.g. download) can read the current
  // resultUrl without becoming stale closures or re-creating every render.
  const stateRef = useRef<TryOnState>(state)
  stateRef.current = state

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

  const setHatFile = useCallback((file: File, sku?: string, variantId?: string | null) => {
    hatRef.current = file
    if (sku) skuRef.current = sku
    // `null` clears, `undefined` leaves the previous value alone (so an
    // existing variant pin survives an unrelated setHatFile call).
    if (variantId !== undefined) variantRef.current = variantId
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
      // Resolve the explicitly chosen variant (if any). When the customer
      // came in via /product/[sku]?v=... the variant identifier was pinned
      // by setHatFile; we use that to send EXACTLY the variant photo to
      // Gemini instead of the multi-variant gallery — otherwise Gemini was
      // picking the parent thumbnail or a sibling variant (the bug: choose
      // BO ĐEN on TC66 product page, get a KẾT result).
      const variantId = variantRef.current
      const pinnedVariant = variantId && product?.variants
        ? product.variants.find(v => v.sku === variantId || v.name === variantId) ?? null
        : null

      // For locks: prefer the variant name when it carries the colour/brim
      // token (variants are named like "BO / ĐEN", "NGANG / TRẮNG", "CONG /
      // ĐEN") because parent product names have been cleaned of the trailing
      // colour. Falls back to the parent name when no variant is pinned.
      const lockName = pinnedVariant?.name
        ? `${product?.name ?? ''} ${pinnedVariant.name}`
        : product?.name
      const detectedColor = lockName ? detectColor(lockName) : null
      const detectedBrim: BrimShape = (lockName ? detectBrim(lockName) : null) ?? 'FLAT'

      // Source images: when a variant is pinned, lead with the variant photo
      // (canonical colour) and then PAD with the rest of the parent gallery
      // so Gemini sees multiple angles. The COLOUR LOCK + BRIM LOCK sentences
      // in the prompt keep it from drifting to a sibling colour even though
      // the gallery may contain photos of other variants. Without a pin we
      // fall back to the colour+brim filter as before.
      const galleryAngles = (product?.images ?? []).filter(
        u => /^https?:\/\//.test(u) && u !== pinnedVariant?.image,
      )
      const sourceImages = pinnedVariant?.image
        ? [pinnedVariant.image, ...galleryAngles]
        : product
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
      console.log('[TryOn] CAP variant pin :', pinnedVariant ? `${pinnedVariant.name ?? pinnedVariant.sku}` : 'none — using gallery filter')
      console.log('[TryOn] CAP colour-lock :', detectedColor ? `${detectedColor.vn} → ${detectedColor.en}` : 'none detected (no name colour token)')
      console.log('[TryOn] CAP brim-lock   :', `${detectedBrim} (${detectedBrim === 'FLAT' ? 'NGANG' : 'CONG'})`)

      type GeminiResp = {
        resultUrl?: string; error?: string; model?: string
        elapsedMs?: number; modelText?: string
        qc?: QcScore | null
        qcFailed?: boolean         // distinct from infra/Gemini errors — see below
      }
      let data: GeminiResp | null = null
      let lastErr = ''

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
          // QC verdict = fail is a DISTINCT outcome from network/Gemini errors —
          // per spec, no auto-regen. Surface the standard "thử lại" message and
          // let the user retry manually.
          if (d.qcFailed) {
            lastErr = d.error || 'Ảnh tạo chưa đạt chất lượng mong muốn. Vui lòng thử lại.'
            data = null
            break
          }
          if (!res.ok || d.error || !d.resultUrl) throw new Error(d.error ?? `HTTP ${res.status}`)
          data = d
          break
        } catch (e) {
          lastErr = e instanceof Error ? e.message : String(e)
          console.warn(`[TryOn] ✗ attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastErr}`)
          if (attempt < MAX_ATTEMPTS) {
            console.log(`[TryOn] ⏳ retry in ${RETRY_DELAY_MS / 1000}s…`)
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS))
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

  // Robust download: works on desktop AND mobile (including iOS Safari /
  // in-app browsers where the plain <a download> trick is unreliable).
  //
  //   1. Data URL (the Gemini try-on result) → decode to a Blob.
  //   2. If the browser supports Web Share API with files (iOS 15+, modern
  //      Android), open the native share sheet — that's the path that lets
  //      the customer pick "Save to Photos" on iOS where direct download is
  //      blocked. Cancellation just falls through to step 3.
  //   3. Otherwise create an object URL and trigger an <a download> click —
  //      the standard desktop / Android Chrome path.
  //
  // Remote http URLs (we don't use this today but the codepath stays for
  // safety) open in a new tab so the user can long-press / right-click → Save.
  const download = useCallback(async () => {
    const url = stateRef.current?.resultUrl
    if (!url) return
    if (!url.startsWith('data:')) {
      window.open(url, '_blank')
      return
    }
    try {
      const blob = await (await fetch(url)).blob()
      const fname = `tcaps-tryon-${Date.now()}.jpg`

      const file = new File([blob], fname, { type: blob.type || 'image/jpeg' })
      const canShareFile =
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      if (canShareFile) {
        try {
          await navigator.share({ files: [file], title: 'TCAPS Try-On' })
          return                  // shared (or saved via sheet) — done
        } catch (e) {
          // User cancelled or the share sheet failed — fall through to <a download>.
          if ((e as Error)?.name !== 'AbortError') console.warn('[download] share fallback:', e)
        }
      }

      const objUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = fname
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objUrl), 1000)
    } catch (e) {
      console.error('[download] failed:', e)
    }
  }, [])

  return {
    state, setFaceFile, setHatFile, runTryOn, retry, reset, download,
    canRun: !!state.faceFile && !!state.hatFile && !state.isProcessing,
  }
}
