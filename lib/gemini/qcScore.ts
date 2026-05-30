// Quality-control pass for AI try-on results. Spec (May 2026):
//
//   The model must perform a PURE HAT SWAP: only the cap is added/changed;
//   the face, pose, expression, gaze, hair, skin, outfit, background and
//   lighting must stay identical to the original selfie.
//
// QC compares (A) the original selfie, (B) the product cap photo and (C) the
// generated try-on, then scores 7 weighted dimensions plus 5 hard-fail flags.
// The business-rule evaluator decides pass/fail — the model's `verdict` field
// is advisory only.

export interface QcScore {
  // Per-dimension scores, 0–100. The Vietnamese label is the user-facing name.
  /** Khuôn mặt (identity) — weight 30% */
  face:        number
  /** Góc mặt (head angle / pose) — weight 20% */
  faceAngle:   number
  /** Biểu cảm (expression + gaze) — weight 15% */
  expression:  number
  /** Tóc — weight 10% */
  hair:        number
  /** Ánh sáng — weight 10% */
  lighting:    number
  /** Background — weight 5% */
  background:  number
  /** Độ chính xác nón (form, brim, colour, logo) — weight 10% */
  hat:         number

  // Hard-fail flags. ANY one true → auto-fail regardless of scores.
  /** Head pose / face angle visibly changed */
  faceAngleChanged:  boolean
  /** Eyes are looking in a different direction */
  gazeChanged:       boolean
  /** Smile / mouth shape / expression changed */
  expressionChanged: boolean
  /** Hair colour, length, hairline or style changed */
  hairChanged:       boolean
  /** Cap form, brim shape, logo, OR colour does not match the product */
  hatChanged:        boolean

  /** Computed weighted total (0–100). Set by `evaluateQc`, NOT by Gemini. */
  total:    number
  /** Model's own (advisory) verdict — not used as source of truth. */
  verdict:  'pass' | 'fail'
  /** Short Vietnamese explanation from the model. */
  reason:   string
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
const QC_MAX_TOKENS    = 512              // 7 numbers + 5 booleans + reason

// Weights per spec (sum = 1.00).
const WEIGHTS = {
  face:        0.30,
  faceAngle:   0.20,
  expression:  0.15,
  hair:        0.10,
  lighting:    0.10,
  background:  0.05,
  hat:         0.10,
} as const

/** Pass threshold for the weighted total. Below this → fail. */
export const QC_PASS_THRESHOLD = 85

// QC prompt — asks Gemini Vision to score 7 dimensions and flag 5 hard-fails.
const QC_PROMPT = `Bạn là hệ thống kiểm duyệt chất lượng ảnh thử nón TCAPS.

Bạn nhận 3 ảnh:
A = ảnh gốc (selfie người dùng)
B = ảnh sản phẩm nón
C = ảnh kết quả try-on do AI tạo

YÊU CẦU TUYỆT ĐỐI: Ảnh C phải GIỮ NGUYÊN mọi thứ ở ảnh A (góc mặt, biểu cảm, hướng nhìn, tóc, màu da, tư thế, background, ánh sáng, tỷ lệ khuôn mặt) và CHỈ thay/thêm chiếc nón từ ảnh B. Mọi thay đổi khác đều là LỖI.

Chấm 7 dimensions (mỗi cái 0–100, càng cao càng giống ảnh gốc):

1. face        — Độ giống KHUÔN MẶT (danh tính). Cùng người? Nét mặt giống?
2. faceAngle   — Độ giống GÓC MẶT / hướng đầu / pose. Đầu nghiêng cùng hướng?
3. expression  — Độ giống BIỂU CẢM + hướng nhìn của mắt.
4. hair        — Độ giống TÓC (màu, kiểu, độ dài, hairline).
5. lighting    — Độ giống ÁNH SÁNG (hướng sáng, độ sáng, nhiệt độ màu).
6. background  — Độ giống BACKGROUND phía sau người.
7. hat         — Độ chính xác của NÓN trong C so với sản phẩm B (form, brim NGANG/CONG, màu, logo, hoạ tiết).

Đặt 5 cờ HARD-FAIL = true khi có dấu hiệu rõ ràng:

- faceAngleChanged   = true nếu GÓC MẶT trong C khác A (nghiêng khác / quay khác / tilt khác).
- gazeChanged        = true nếu HƯỚNG NHÌN của mắt trong C khác A.
- expressionChanged  = true nếu BIỂU CẢM khác (cười khác, miệng khác, mắt khác).
- hairChanged        = true nếu TÓC khác (màu, kiểu, độ dài, hoặc hairline khác).
- hatChanged         = true nếu NÓN trong C khác sản phẩm B (form sai, brim sai cong/ngang, logo sai, MÀU sai).

reason: 1–2 câu tiếng Việt nêu lỗi chính (nếu fail) hoặc lý do đạt (nếu pass).

verdict: "pass" nếu tất cả 5 cờ = false VÀ điểm trung bình bạn ước tính cao; "fail" ngược lại. (Hệ thống sẽ tính lại theo công thức riêng — đây chỉ là tham khảo.)

Trả CHÍNH XÁC JSON này, không gì khác:

{
  "face":              0-100,
  "faceAngle":         0-100,
  "expression":        0-100,
  "hair":              0-100,
  "lighting":          0-100,
  "background":        0-100,
  "hat":               0-100,
  "faceAngleChanged":  true/false,
  "gazeChanged":       true/false,
  "expressionChanged": true/false,
  "hairChanged":       true/false,
  "hatChanged":        true/false,
  "verdict":           "pass" | "fail",
  "reason":            "..."
}`

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
 * the caller decides whether to fail-open or fail-closed. The returned `total`
 * is computed locally from the weighted dimensions — Gemini's `verdict` is
 * advisory only.
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
    const m = text.match(/\{[\s\S]*\}/)
    if (m) try { parsed = JSON.parse(m[0]) } catch { /* fall through */ }
  }
  if (!parsed) throw new Error(`QC JSON parse failed: ${text.slice(0, 200)}`)

  const dim = {
    face:       clampPct(parsed.face),
    faceAngle:  clampPct(parsed.faceAngle),
    expression: clampPct(parsed.expression),
    hair:       clampPct(parsed.hair),
    lighting:   clampPct(parsed.lighting),
    background: clampPct(parsed.background),
    hat:        clampPct(parsed.hat),
  }
  const total = Math.round(
    dim.face       * WEIGHTS.face +
    dim.faceAngle  * WEIGHTS.faceAngle +
    dim.expression * WEIGHTS.expression +
    dim.hair       * WEIGHTS.hair +
    dim.lighting   * WEIGHTS.lighting +
    dim.background * WEIGHTS.background +
    dim.hat        * WEIGHTS.hat,
  )

  const score: QcScore = {
    ...dim,
    faceAngleChanged:  parsed.faceAngleChanged  === true,
    gazeChanged:       parsed.gazeChanged       === true,
    expressionChanged: parsed.expressionChanged === true,
    hairChanged:       parsed.hairChanged       === true,
    hatChanged:        parsed.hatChanged        === true,
    total,
    verdict:           parsed.verdict === 'fail' ? 'fail' : 'pass',
    reason:            typeof parsed.reason === 'string' ? parsed.reason : '',
  }
  console.log(`[QC] ${elapsedMs}ms`, score)
  return score
}

/**
 * Source-of-truth pass/fail. Pass requires BOTH:
 *   1. All 5 hard-fail flags are false (no auto-disqualifying drift), AND
 *   2. Weighted total ≥ QC_PASS_THRESHOLD (85).
 */
export function evaluateQc(s: QcScore): 'pass' | 'fail' {
  if (s.faceAngleChanged)   return 'fail'
  if (s.gazeChanged)        return 'fail'
  if (s.expressionChanged)  return 'fail'
  if (s.hairChanged)        return 'fail'
  if (s.hatChanged)         return 'fail'
  if (s.total < QC_PASS_THRESHOLD) return 'fail'
  return 'pass'
}

/** Standard user-facing message when QC verdict = fail. */
export const QC_FAIL_MESSAGE =
  'Ảnh tạo chưa đạt chất lượng mong muốn. Vui lòng thử lại.'
