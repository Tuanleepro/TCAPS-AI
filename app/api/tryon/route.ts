import { NextRequest, NextResponse } from 'next/server'
import { scoreTryOn, evaluateQc, QC_FAIL_MESSAGE, type QcScore } from '@/lib/gemini/qcScore'

export const maxDuration = 60
export const runtime = 'nodejs'

const MAX_DATAURL_CHARS = 15 * 1024 * 1024   // allow full-quality person photos
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-2.5-flash-image'

// Try-on = put THIS cap on THIS person. The HEAD/FACE is a locked, untouchable
// region copied from image 1 (identity must never drift); the cap design is
// locked; only the CLOTHING and BACKGROUND below the neck may be restyled to
// coordinate with the cap. Separating "head = frozen" from "outfit = free" is
// what lets the outfit change without the face changing.
const TRYON_PROMPT =
  'GOAL: take the person in image 1 and show them wearing the cap from image 2, in ONE realistic ' +
  'photo. You MAY restyle their clothing and background to match the cap, but their HEAD and FACE ' +
  'must stay EXACTLY as in image 1. ' +

  'RULE 1 — FREEZE THE HEAD & FACE (most important, non-negotiable): treat the entire head as a FIXED ' +
  'region copied pixel-for-pixel from image 1. ' +

  '(1.a) HEAD ROTATION & POSE — preserve EXACTLY. The head\'s rotation along all three axes (yaw, ' +
  'pitch, roll) MUST be IDENTICAL to image 1. If image 1 shows the person at a 3/4 turn (head ' +
  'rotated partly to one side), the output MUST be at the SAME 3/4 turn — do NOT rotate the head ' +
  'to face the camera frontally. If image 1 is frontal, keep it frontal. If image 1 is in profile, ' +
  'keep it in profile. If the head is tilted up/down/sideways, keep the EXACT same tilt. Do NOT ' +
  '"studio-fy" the pose into a centred portrait. Do NOT straighten a tilted head. Do NOT turn a ' +
  '3/4 selfie into a front-facing pose. The eyes must look in the SAME direction as image 1. The ' +
  'head must occupy the SAME position in the frame at the SAME size and SAME angle. This is the ' +
  '#1 failure mode: Gemini commonly re-poses the head when the background changes — that is ' +
  'FORBIDDEN. ' +

  '(1.b) FACIAL IDENTITY & FEATURES — preserve EXACTLY. The face, facial features (eyes, eye ' +
  'spacing, eyebrows, nose, mouth, lips, jawline, chin, cheekbones), face shape and proportions, ' +
  'skin tone, skin TEXTURE, expression, hair and hairline MUST be IDENTICAL to image 1. Preserve ' +
  'EVERY facial detail: acne, blemishes, freckles, moles, scars, eye-bags, dark circles, pores, ' +
  'slight asymmetries, oiliness — ALL stay. Do NOT smooth skin, whiten skin, or add makeup. Do NOT ' +
  'slim/sharpen/sculpt the jawline. Do NOT enlarge or open the eyes. Do NOT plump, thin or reshape ' +
  'the lips. Do NOT narrow or reshape the nose. Do NOT raise or reshape the eyebrows. Do NOT ' +
  'redraw, age, change gender, or swap the face. Do NOT make the person look more model-like, ' +
  'handsome, or "glow-up" / TikTok-filter version of themselves. A viewer must INSTANTLY recognise ' +
  'the SAME exact selfie face — not a polished look-alike. NO blemish or acne cleanup is allowed. ' +

  'RULE 2 — IMAGES 2+ ARE CAP-ONLY REFERENCES (anti-scene-swap, non-negotiable): images 2 and ' +
  'onward show the SAME cap from different angles (front / side / back / detail). These reference ' +
  'photos MAY contain a model wearing the cap, a styled studio or street scene, a brick wall, ' +
  'graffiti, denim or other props. IGNORE every one of those non-cap elements. Do NOT copy the ' +
  "model's face, the model's body, the model's outfit, the model's pose, the model's hair, OR the " +
  "background, lighting and scene from the cap reference photos. Image 1 is the ONLY source for " +
  'the PERSON (face, hair, head pose). The cap references are the ONLY source for the CAP. Mixing ' +
  'them up — drawing the model from the cap reference instead of the user from image 1 — is the ' +
  'most severe failure mode and is FORBIDDEN. ' +

  'RULE 3 — REPRODUCE THE CAP FROM IMAGES 2+ WITH EVERY DETAIL INTACT (most critical for the cap): ' +
  'study ALL the cap references together. The cap in the output must match the product cap ' +
  'pixel-faithfully — NOTHING about its design may change. Reproduce EXACTLY: ' +
  '(i) silhouette and crown shape (height, panel count, structured vs unstructured); ' +
  '(ii) BRIM SHAPE — flat/straight (snapback "lưỡi ngang") vs curved (baseball "lưỡi cong") is a ' +
  'defining feature; do NOT swap one for the other under any circumstances; ' +
  '(iii) brim length and underside colour; ' +
  '(iv) base colour and any colour blocking — do NOT recolour to match the outfit or scene; ' +
  '(v) materials and texture (cotton, mesh, leather, suede, velvet); panel seams and stitching; ' +
  '(vi) the EXACT logo / text / wordmark / graphic / pattern / patch / embroidery — every line, ' +
  'every letter, every colour of the artwork, copied pixel for pixel. Do NOT redesign, recolour, ' +
  're-letter, simplify, stylise, smooth, blur, or substitute the artwork. If a logo is small or ' +
  'partly obscured, copy it as-is from the highest-resolution reference rather than inventing it; ' +
  '(vii) any tags, side patches, adjuster style (snapback / strapback / fitted) and undervisor print. ' +
  'Treat the cap design as INTELLECTUAL PROPERTY — the customer is buying this exact cap and the ' +
  'output must be recognisably the SAME product. ' +

  'RULE 4 — FIT THE CAP NATURALLY (critical for realism): size it correctly to the head so it looks ' +
  'genuinely worn — it sits snugly on the crown, the brim rests just above the eyebrows, proportional ' +
  'to the head width, angle matching the head. It must NOT be oversized, NOT float above the hair, ' +
  'NOT sit too high or too tilted. Add a soft natural contact shadow under the brim and where the ' +
  'cap meets the hair. The cap is added ON TOP of the existing head — it must not push, resize, or ' +
  'reshape the head/face underneath. ' +

  'RULE 5 — CLOTHING & BACKGROUND (you MAY restyle, BELOW THE NECK ONLY, from image 1 — NOT from ' +
  'the cap references): you may change the outfit, its colours, the background and lighting into a ' +
  'cohesive streetwear look that coordinates with the cap. But the restyle must be a CREATIVE choice ' +
  '— do NOT copy the model/scene from the cap reference photos (see RULE 2). This freedom applies ' +
  'ONLY to the body below the neck and the scene behind the person — it must NEVER touch the head, ' +
  'face, hair, or head pose (see RULE 1). Keep it a believable real photograph — natural fabric, ' +
  'real lighting. ' +

  'RULE 6 — KEEP THE FRAMING: same camera angle, same crop/zoom and same orientation as image 1, with ' +
  "the person's head in the SAME position and SAME size as image 1 (this is what keeps the identity intact). " +

  'AVOID: re-posing the head (turning a 3/4 selfie frontal, straightening a tilt, "studio-fying" ' +
  'a casual angle), changing the head rotation along ANY axis, changing the gaze direction, a ' +
  'different or more model-like face, slimming/reshaping the face or head, a plastic/over-' +
  'airbrushed look, 3D/CGI/render or video-game look, an over-glossy commercial-ad look, moving or ' +
  'resizing the head, an oversized or floating cap, distorted hands, added text or watermark. ' +

  'OUTPUT: exactly ONE realistic photo. The head — including its EXACT rotation (yaw/pitch/roll), ' +
  'position, size and gaze direction — must look as if it were lifted pixel-for-pixel from image 1. ' +
  'Priority order (highest first): SAME head pose & angle > SAME face identity > exact cap design ' +
  '& fit > restyled outfit/scene.'

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
    // Snapback brim (FLAT/lưỡi ngang) vs baseball brim (CURVED/lưỡi cong) is a
    // defining feature the customer chose. Gemini was swapping them when the
    // product gallery contained both variants. Text-locking the brim shape
    // prevents that drift.
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
      return NextResponse.json({
        qcFailed: true,
        qc,
        error:    QC_FAIL_MESSAGE,
      })   // 200 so the client treats it as a known QC failure, not a network error
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
