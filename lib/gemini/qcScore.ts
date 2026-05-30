// Quality-control pass for AI try-on results — runs ONCE after Gemini generates
// the image. Uses Gemini Vision (gemini-2.5-flash) to compare the original
// selfie, the product cap photo and the generated try-on, and returns numeric
// scores. The business-rule thresholds (see `evaluateQc`) decide pass/fail —
// the model's own verdict field is advisory and logged but not authoritative.

export interface QcScore {
  /** 0–100: how well the person's face/identity from the selfie is preserved */
  face_similarity: number
  /** 0–100: how well the cap in the result matches the product photo */
  hat_similarity:  number
  /** 0–100: how realistic / photographic the result looks */
  realism:         number
  /** model-detected sign of beautification or face/identity change */
  face_changed:    boolean
  /** model's own (advisory) verdict — not used as source of truth */
  verdict:         'pass' | 'fail'
  /** short Vietnamese explanation from the model */
  reason:          string
}

interface QcInput {
  /** data URL of the user's original selfie (image A) */
  originalDataUrl: string
  /** data URL of the product cap photo (image B) — pass ONE clear angle */
  productDataUrl:  string
  /** data URL of Gemini's generated try-on (image C) */
  resultDataUrl:   string
  /** Gemini API key */
  apiKey:          string
}

const QC_MODEL_DEFAULT = 'gemini-2.5-flash'
const QC_TIMEOUT_MS    = 10_000           // hard cap — spec: do not add >10s
const QC_MAX_TOKENS    = 256              // JSON is small

// QC prompt — spec calibration:
//   • Skin smoothing/whitening alone is ALLOWED (light beauty pass) — do NOT
//     treat it as identity drift. Product owner explicitly wants the cleanup.
//   • IDENTITY drift (different person, swapped face, reshaped features, pose
//     change, different hair) IS forbidden → set face_changed = true.
//   • Hat similarity must penalise BOTH colour mismatch AND brim shape
//     mismatch (flat snapback rendered as a curved baseball cap, etc).
const QC_PROMPT = `Bạn là hệ thống kiểm định ảnh thử nón.

So sánh:

A = ảnh gốc
B = ảnh sản phẩm
C = ảnh kết quả

Đánh giá:

1. Mức độ giữ nguyên DANH TÍNH + NÉT MẶT + GÓC MẶT của người trong A.
   - Cho phép: làm mịn da, đều màu da, làm trắng nhẹ, xoá mụn nhẹ (light beauty pass) — đây KHÔNG phải lỗi.
   - CHẤM THẤP (dưới 75) nếu: đổi người, đổi nét mặt (thon hàm, to mắt, hồng môi, sửa mũi, sửa lông mày), đổi góc mặt / hướng nhìn, đổi kiểu tóc / màu tóc, hoặc nhìn rõ là một người khác / một look-alike đẹp hơn.
2. Mức độ giống sản phẩm nón.
   - CHẤM THẤP (dưới 70) nếu MÀU nón trong C khác MÀU nón trong B (ví dụ B là TRẮNG nhưng C là ĐEN).
   - CHẤM THẤP (dưới 70) nếu LƯỠI NÓN (brim) trong C khác form trong B — đặc biệt là lưỡi ngang (flat / snapback) bị render thành lưỡi cong (curved / baseball cap), hoặc ngược lại.
3. Mức độ chân thực.
4. face_changed = true CHỈ khi đổi danh tính / nét mặt / góc mặt / tóc. KHÔNG đặt true chỉ vì da mịn hơn hoặc trắng hơn nhẹ.

Trả JSON:

{
"face_similarity": 0-100,
"hat_similarity": 0-100,
"realism": 0-100,
"face_changed": true/false,
"verdict": "pass" | "fail",
"reason": "..."
}

Chỉ trả JSON hợp lệ.
Không giải thích thêm.`

function splitDataUrl(d: string): { mimeType: string; data: string } {
  const semi = d.indexOf(';')
  const comma = d.indexOf(',')
  return { mimeType: d.slice(5, semi), data: d.slice(comma + 1) }
}

function clampPct(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

/**
 * Run the QC check. Throws on infra failure (network, timeout, malformed JSON);
 * the caller decides whether to fail-open or fail-closed.
 */
export async function scoreTryOn(input: QcInput): Promise<QcScore> {
  const model = process.env.GEMINI_VISION_MODEL?.trim() || QC_MODEL_DEFAULT
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

  const A = splitDataUrl(input.originalDataUrl)
  const B = splitDataUrl(input.productDataUrl)
  const C = splitDataUrl(input.resultDataUrl)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), QC_TIMEOUT_MS)
  const t0 = Date.now()

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': input.apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: QC_PROMPT },
            { text: 'Ảnh A — ảnh gốc:' },
            { inline_data: { mime_type: A.mimeType, data: A.data } },
            { text: 'Ảnh B — ảnh sản phẩm nón:' },
            { inline_data: { mime_type: B.mimeType, data: B.data } },
            { text: 'Ảnh C — ảnh kết quả try-on:' },
            { inline_data: { mime_type: C.mimeType, data: C.data } },
          ],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature:      0,
          maxOutputTokens:  QC_MAX_TOKENS,
        },
      }),
    })
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') {
      throw new Error(`QC timeout sau ${QC_TIMEOUT_MS / 1000}s`)
    }
    throw new Error(`QC network: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    clearTimeout(timer)
  }

  const elapsedMs = Date.now() - t0
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`QC HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  const json = await res.json().catch(() => null) as unknown
  const text = (() => {
    const parts =
      (json as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
        ?.candidates?.[0]?.content?.parts ?? []
    return parts.find(p => typeof p?.text === 'string')?.text ?? ''
  })()

  let parsed: Record<string, unknown> | null = null
  try {
    parsed = JSON.parse(text) as Record<string, unknown>
  } catch {
    // Defensive: strip code fences / surrounding text if the model added any.
    const m = text.match(/\{[\s\S]*\}/)
    if (m) try { parsed = JSON.parse(m[0]) } catch { /* fall through */ }
  }
  if (!parsed) throw new Error(`QC JSON parse failed: ${text.slice(0, 200)}`)

  const score: QcScore = {
    face_similarity: clampPct(parsed.face_similarity),
    hat_similarity:  clampPct(parsed.hat_similarity),
    realism:         clampPct(parsed.realism),
    face_changed:    parsed.face_changed === true,
    verdict:         parsed.verdict === 'fail' ? 'fail' : 'pass',
    reason:          typeof parsed.reason === 'string' ? parsed.reason : '',
  }
  console.log(`[QC] ${elapsedMs}ms`, score)
  return score
}

/**
 * Source-of-truth pass/fail decision. Thresholds:
 *   face_similarity < 75  → fail   (light beauty pass is now allowed; we only
 *                                   reject when identity / features / pose drift)
 *   hat_similarity  < 75  → fail   (includes colour AND brim shape mismatch —
 *                                   see QC_PROMPT item 2)
 *   realism         < 70  → fail
 *   face_changed   = true → fail
 */
export function evaluateQc(s: QcScore): 'pass' | 'fail' {
  if (s.face_changed)         return 'fail'
  if (s.face_similarity < 75) return 'fail'
  if (s.hat_similarity  < 75) return 'fail'
  if (s.realism         < 70) return 'fail'
  return 'pass'
}

/** Standard user-facing message when QC verdict = fail. */
export const QC_FAIL_MESSAGE =
  'Ảnh tạo chưa đạt chất lượng mong muốn. Vui lòng thử lại.'
