import { NextRequest, NextResponse } from 'next/server'
import { scoreTryOn, evaluateQc, QC_FAIL_MESSAGE, type QcScore } from '@/lib/gemini/qcScore'

export const maxDuration = 60
export const runtime = 'nodejs'

const MAX_DATAURL_CHARS = 15 * 1024 * 1024   // allow full-quality person photos
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-2.5-flash-image'

// Try-on = PURE HAT SWAP. Image 1 is the canonical source for EVERYTHING except
// the cap (face, hair, skin, outfit, pose, expression, gaze, background and
// lighting). Images 2+ are the canonical source for the CAP ONLY. Anything
// added, removed or restyled beyond placing the cap on the head is a defect.
const TRYON_PROMPT =
  'GOAL: take the person in image 1 and add THE CAP from image 2 onto their head, producing ONE ' +
  'photorealistic photo. This is a PURE HAT SWAP — the ONLY visible change vs image 1 must be that ' +
  'the cap from images 2+ now sits on the head. EVERYTHING else in image 1 is preserved exactly. ' +

  'RULE 1 — KEEP IMAGE 1 EXACTLY (most important, non-negotiable): treat image 1 as the canonical ' +
  'source for the person, hair, skin, outfit, pose, expression, gaze, background and lighting. The ' +
  'output MUST keep ALL of the following IDENTICAL to image 1 — pixel-faithful where possible: ' +
  '(a) the person — same face, same identity, same facial features (eye shape, eye spacing, eyebrows, ' +
  'nose, mouth, lips, jawline, chin, cheekbones, face proportions); ' +
  '(b) head pose — same angle/tilt, same direction the face is pointing, same head size and position; ' +
  '(c) expression — same mouth, same eyes, same gaze direction (where the eyes look); ' +
  '(d) hair — same colour, same length, same style, same hairline, same volume; ' +
  '(e) skin — same colour, same tone, same texture, same blemishes/freckles/moles (do NOT smooth, do ' +
  'NOT whiten, do NOT clean up — beauty cleanup is FORBIDDEN in this mode); ' +
  '(f) outfit — same clothing, same colours, same fabric (do NOT restyle or replace any clothing); ' +
  '(g) background — same scene, same objects, same wall/sky/setting (do NOT regenerate or restyle); ' +
  '(h) lighting — same direction of light, same brightness, same colour temperature, same shadows; ' +
  '(i) framing — same camera angle, same crop, same zoom, same orientation. ' +
  'Any change to (a)–(i) is a FAILURE. ' +

  'RULE 2 — USE THE EXACT CAP FROM IMAGES 2+ ONLY (cap content, NOT scene content): images 2 and ' +
  'onward are the SAME cap shown from different angles (front / side / back / detail). Some of these ' +
  'product reference photos may include a MODEL wearing the cap, a studio/street background, or ' +
  'styled clothing — IGNORE all of that. Do NOT copy the model, their face, their outfit, their pose ' +
  'or the background from the cap reference photos. Extract ONLY the cap itself, then place THAT cap ' +
  "on the user's head from image 1. The user's photo (image 1) is the source for the PERSON, OUTFIT, " +
  'BACKGROUND, LIGHTING and CAMERA framing; the cap references are the source for the CAP ONLY. ' +

  'RULE 3 — REPRODUCE THE CAP EXACTLY (shape, brim, colour, artwork): match the cap from images 2+ ' +
  'pixel-faithfully — its real silhouette, crown shape, brim shape (flat vs curved — this is a ' +
  'specific defining feature, do NOT swap one for the other), brim length, colour, materials, AND ' +
  'especially the exact logo / text / graphic / pattern. Do not redesign, recolour, re-letter or ' +
  'substitute the artwork. ' +

  'RULE 4 — FIT THE CAP NATURALLY (the only allowed addition): place the cap on the existing head ' +
  'with the correct size and angle — sits snugly on the crown, brim rests just above the eyebrows, ' +
  'proportional to the head width, angle matching the head. Add a soft natural contact shadow under ' +
  'the brim and where the cap meets the hair (so it looks worn, not pasted). The cap is added ON ' +
  'TOP of the existing head — it must not push, resize, or reshape the head, face, or hair underneath. ' +
  'Hair that is visible around / below the cap MUST stay identical to image 1 (same colour, same ' +
  'length, same style — only HIDDEN where physically covered by the cap crown). ' +

  'AVOID: changing the person, the face, the facial features, the head pose, the gaze direction, ' +
  'the expression, the hair, the skin tone or texture, the clothing, the background, or the ' +
  'lighting vs image 1. AVOID copying anything from the cap reference scenes. AVOID swapping a flat ' +
  'brim for curved (or vice versa). AVOID a "glow-up" / beautified look. AVOID 3D/CGI/render look. ' +
  'AVOID added text or watermark. ' +

  'OUTPUT: exactly ONE photorealistic photo. It must look like image 1 with ONLY the cap added — ' +
  'as if the user took the EXACT SAME photo while wearing the cap. ' +
  'Priority order (highest first): preserve EVERYTHING from image 1 > add the EXACT cap from ' +
  'images 2+ > natural cap fit and contact shadow.'

function assertDataUrl(v: unknown, label: string): string {
  if (typeof v !== 'string' || !/^data:image\/(jpe?g|png|webp);base64,/.test(v)) {
    throw new Error(`${label} không hợp lệ — cần data URL ảnh`)
  }
  if (v.length > MAX_DATAURL_CHARS) {
    throw new Error(`${label} quá lớn — vui lòng dùng ảnh nhỏ hơn`)
  }
  return v
}

function splitDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const comma = dataUrl.indexOf(',')
  const mimeType = dataUrl.slice(5, dataUrl.indexOf(';'))   // after "data:"
  return { mimeType, data: dataUrl.slice(comma + 1) }
}

// Fetch a product cap photo SERVER-SIDE → data URL. Only allows the product CDN.
// This replaces the old client-side fetch+canvas that broke in mobile webviews.
async function urlToDataUrl(rawUrl: string): Promise<string> {
  const u = new URL(rawUrl)
  if (u.protocol !== 'https:' || u.hostname !== 'content.pancake.vn') {
    throw new Error('host ảnh nón không hợp lệ')
  }
  const r = await fetch(u.toString(), { headers: { accept: 'image/*' } })
  if (!r.ok) throw new Error(`tải ảnh nón lỗi HTTP ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  const ct = (r.headers.get('content-type') || 'image/jpeg').split(';')[0]
  const mime = /^image\/(jpe?g|png|webp)$/.test(ct) ? ct : 'image/jpeg'
  if (buf.length > 8 * 1024 * 1024) throw new Error('ảnh nón quá lớn')
  return `data:${mime};base64,${buf.toString('base64')}`
}

interface GeminiResult { dataUrl: string; elapsedMs: number; modelText: string }

// ─────────────────────────────────────────────────────────────────────────────
// Gemini generative try-on — synchronous. Throws a clear error (no fallback).
// Logs prompt, timing and response so you can confirm the AI actually ran.
// ─────────────────────────────────────────────────────────────────────────────
async function runGeminiTryOn(person: string, garments: string[], prompt: string): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) throw new Error('GEMINI_API_KEY chưa được cấu hình trong .env.local')

  const p = splitDataUrl(person)
  const gParts = garments.map(splitDataUrl)   // 1..N cap angles of the SAME cap
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

  console.log('────────────────────────────────────────────────────────')
  console.log('[Gemini] ▶ GENERATIVE TRY-ON REQUEST')
  console.log('[Gemini]   model   :', GEMINI_MODEL)
  console.log('[Gemini]   keyTail :', '…' + key.slice(-6))
  console.log('[Gemini]   person  :', p.mimeType, `(${(p.data.length / 1024).toFixed(0)} KB)`)
  console.log('[Gemini]   capRefs :', gParts.length, 'image(s) —', gParts.map(g => `${(g.data.length / 1024).toFixed(0)}KB`).join(', '))
  console.log('[Gemini]   prompt  :', prompt)

  const t0 = Date.now()
  let res: Response
  try {
    res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: p.mimeType, data: p.data } },
            ...gParts.map(g => ({ inline_data: { mime_type: g.mimeType, data: g.data } })),
          ],
        }],
        // Very low temperature: minimise creative deviation on the face. The
        // model still has enough room to restyle clothing/background but is
        // strongly discouraged from "improving" the face (beautification was
        // the recurring failure at 0.22). Going lower than ~0.1 makes the
        // outfit/scene look stale.
        generationConfig: { responseModalities: ['IMAGE'], temperature: 0.1 },
      }),
    })
  } catch (e) {
    const ms = Date.now() - t0
    console.error(`[Gemini] ✗ NETWORK FAIL after ${ms}ms:`, e)
    throw new Error(`Không kết nối được Gemini API: ${e instanceof Error ? e.message : e}`)
  }

  const elapsedMs = Date.now() - t0
  const json = await res.json().catch(() => null) as any

  console.log('[Gemini] ◀ RESPONSE  http:', res.status, '| time:', elapsedMs + 'ms')

  if (!res.ok) {
    console.error('[Gemini] ✗ ERROR body:', JSON.stringify(json?.error ?? json, null, 2))
    throw new Error(`Gemini lỗi: ${json?.error?.message ?? `HTTP ${res.status}`}`)
  }

  const cand  = json?.candidates?.[0]
  const parts: any[] = cand?.content?.parts ?? []
  const textParts = parts.filter(p => typeof p?.text === 'string').map(p => p.text).join(' ').trim()
  const img = parts.find(p => p?.inlineData?.data || p?.inline_data?.data)
  const out = img?.inlineData ?? img?.inline_data

  console.log('[Gemini]   finish  :', cand?.finishReason ?? 'n/a', '| parts:', parts.length, '| image:', !!out, '| text:', textParts ? `"${textParts.slice(0, 160)}"` : 'none')
  if (json?.promptFeedback?.blockReason) console.warn('[Gemini]   blocked :', json.promptFeedback.blockReason)

  if (!out?.data) {
    const block = json?.promptFeedback?.blockReason
    console.error('[Gemini] ✗ NO IMAGE returned')
    throw new Error(
      block ? `Gemini chặn ảnh (${block})`
      : textParts ? `Gemini không trả ảnh — model nói: "${textParts.slice(0, 160)}"`
      : 'Gemini không trả về ảnh',
    )
  }

  const outMime = out.mimeType ?? out.mime_type ?? 'image/png'
  console.log('[Gemini] ✓ image OK:', outMime, `(${(out.data.length / 1024).toFixed(0)} KB) in ${elapsedMs}ms`)
  console.log('────────────────────────────────────────────────────────')

  return { dataUrl: `data:${outMime};base64,${out.data}`, elapsedMs, modelText: textParts }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tryon
// Body (JSON): { person, garment, prompt? }  — both data URLs
// Returns { resultUrl, elapsedMs, ... } synchronously, or { error } on failure.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as
      | { person?: unknown; garment?: unknown; garments?: unknown; garmentUrls?: unknown; prompt?: unknown
          personWidth?: unknown; personHeight?: unknown
          productColor?: unknown; productName?: unknown; productBrim?: unknown }
      | null
    if (!body) return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 })

    const person  = assertDataUrl(body.person, 'Ảnh selfie')

    // Cap images. Preferred: `garmentUrls` (product photo URLs) fetched HERE on the
    // server — mobile in-app browsers can't reliably do cross-origin fetch/canvas,
    // so doing it server-side is what makes try-on work on phones. Fallback:
    // client-provided `garments` / `garment` data URLs (e.g. an uploaded hat file).
    let garments: string[] = []
    if (Array.isArray(body.garmentUrls) && body.garmentUrls.length) {
      for (const u of body.garmentUrls) {
        if (typeof u !== 'string') continue
        try { garments.push(await urlToDataUrl(u)) }
        catch (e) { console.warn('[tryon] cap url skipped:', u, e instanceof Error ? e.message : e) }
      }
    }
    if (!garments.length) {
      const rawGarments = Array.isArray(body.garments) && body.garments.length
        ? body.garments
        : (body.garment != null ? [body.garment] : [])
      garments = rawGarments.map((g, i) => assertDataUrl(g, `Ảnh nón ${i + 1}`))
    }
    if (!garments.length) return NextResponse.json({ error: 'Thiếu ảnh nón để thử' }, { status: 400 })
    const basePrompt =
      typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : TRYON_PROMPT

    // ── Colour lock ──────────────────────────────────────────────────────────
    // If the client knows the cap's primary colour (parsed from the product
    // name, e.g. "TRẮNG" → WHITE), append an explicit colour-lock sentence to
    // the prompt. Text + image together pin the colour MUCH harder than image
    // alone — Gemini was otherwise occasionally outputting the wrong colourway
    // (black skull cap when the product was the WHITE variant) because its
    // prior on streetwear skull-graphic caps is heavily black.
    const productColor =
      typeof body.productColor === 'string' && /^[A-Z]+$/.test(body.productColor.trim())
        ? body.productColor.trim().toUpperCase()
        : null
    const productName =
      typeof body.productName === 'string' ? body.productName.trim() : null

    const colourLock = productColor
      ? ` MANDATORY COLOUR LOCK: the cap's base colour is ${productColor}. The cap in the OUTPUT MUST be ${productColor} — NOT black, NOT a darker shade, NOT a different colourway, NOT recoloured to match the outfit or scene. This overrides any visual ambiguity in the reference images: if any reference appears to show a different colour variant, IGNORE that — the cap is ${productColor}.`
      : ''

    // ── Brim shape lock ──────────────────────────────────────────────────────
    // The cap brim is a defining feature streetwear customers explicitly choose
    // (snapback flat vs curved). Gemini was swapping FLAT for CURVED when the
    // product gallery contained both brim variants (e.g. TC67 has NGANG +
    // CONG variant photos). Text-lock the brim shape so the model can't drift.
    const productBrim =
      body.productBrim === 'FLAT' || body.productBrim === 'CURVED'
        ? body.productBrim
        : null
    const brimLock = productBrim
      ? ` MANDATORY BRIM LOCK: the cap's brim is ${productBrim === 'FLAT' ? 'FLAT and STRAIGHT (lưỡi ngang) — completely horizontal, NOT curved, NOT bent down at the sides' : 'CURVED (lưỡi cong) — bent down at the sides like a traditional baseball cap, NOT flat'}. The brim shape in the OUTPUT MUST be ${productBrim}. If any reference image appears to show the opposite brim shape, IGNORE that — this cap is ${productBrim}.`
      : ''

    const prompt = basePrompt + colourLock + brimLock

    // ── Exact size/dimensions of the PERSON image actually sent to Gemini ──
    const personWidth  = typeof body.personWidth  === 'number' ? body.personWidth  : null
    const personHeight = typeof body.personHeight === 'number' ? body.personHeight : null
    const personBytes  = Math.round((splitDataUrl(person).data.length * 3) / 4)
    console.log('PERSON_IMAGE_SIZE', Math.round(personBytes / 1024), 'KB')
    console.log('PERSON_IMAGE_DIMENSIONS', personWidth ?? '?', personHeight ?? '?')
    console.log('CAP_REFERENCE_IMAGES', garments.length)
    console.log('CAP_COLOUR_LOCK', productColor ?? 'none', productName ? `(${productName})` : '')
    console.log('CAP_BRIM_LOCK  ', productBrim  ?? 'none')

    const { dataUrl, elapsedMs, modelText } = await runGeminiTryOn(person, garments, prompt)

    // ── Quality control via Gemini Vision (≤10s, fail-open on infra error) ──
    // Source of truth for pass/fail is `evaluateQc` (business-rule thresholds),
    // NOT the model's own verdict field. If QC verdict is `fail`, we refuse to
    // return the image and surface a friendly retry prompt — no auto-regen
    // (per spec: user manually retries).
    let qc: QcScore | null = null
    let qcVerdict: 'pass' | 'fail' = 'pass'
    try {
      const apiKey = process.env.GEMINI_API_KEY?.trim()
      if (apiKey && garments[0]) {
        qc = await scoreTryOn({
          originalDataUrl: person,
          productDataUrl:  garments[0],    // one product reference is enough
          resultDataUrl:   dataUrl,
          apiKey,
        })
        qcVerdict = evaluateQc(qc)
        console.log(`[QC] verdict=${qcVerdict} (model said: ${qc.verdict})  ${qc.reason ? '· ' + qc.reason : ''}`)
      }
    } catch (e) {
      // Fail-OPEN: don't punish the user when our QC infra hiccups. The image
      // still goes through, just without verified scores.
      console.warn('[QC] check failed (fail-open):', e instanceof Error ? e.message : e)
      qc = null
      qcVerdict = 'pass'
    }

    if (qcVerdict === 'fail') {
      // Return the FAILED image alongside the verdict so the client can pick
      // the BEST attempt as a graceful fallback when every retry in a cycle
      // fails (rather than throwing the user back to a red error screen). The
      // client compares `qc.total` across attempts and surfaces the highest.
      return NextResponse.json({
        qcFailed:  true,
        qc,
        resultUrl: dataUrl,
        elapsedMs,
        error:     QC_FAIL_MESSAGE,
      })   // 200 — known QC failure, not a network error
    }

    return NextResponse.json({
      resultUrl:   dataUrl,
      backend:     'gemini',
      model:       GEMINI_MODEL,
      elapsedMs,
      qc,                                   // null if QC infra failed (fail-open)
      promptChars: prompt.length,
      modelText:   modelText || undefined,
    })

  } catch (err) {
    console.error('[POST /api/tryon] ✗', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
