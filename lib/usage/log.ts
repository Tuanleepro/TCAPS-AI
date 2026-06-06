// Usage logging for the Gemini try-on pipeline.
//
// Each try-on request appends ONE row to the "TRYON_LOG" tab of the same
// Google Sheet that holds orders (env GOOGLE_SHEET_ID). This is the audit
// trail for the dashboard at /admin/usage and the basis for cost forecasting.
//
// Schema (must match `LOG_HEADERS` below):
//   A timestamp      ISO 8601 UTC, parsable by Sheets as datetime
//   B ip             client IP (from x-forwarded-for / x-real-ip)
//   C model          model id (e.g. gemini-2.5-flash-image)
//   D sku            parent product SKU (or empty if unknown)
//   E variant_sku    variant SKU/name (or empty)
//   F attempt        1..MAX_ATTEMPTS — useful to see retry rate
//   G cap_refs       number of cap reference images sent to Gemini
//   H input_tokens   estimated input tokens (images + text)
//   I output_tokens  estimated output tokens (images + text)
//   J cost_usd       USD cost estimate at our pricing constants below
//   K elapsed_ms     time spent INSIDE the Gemini call
//   L status         success | qc_failed | error
//   M error          short error message (truncated to 240 chars)
//   N qc_score       optional composite QC score (0–1) if available
//   O cache_hit      'TRUE' / 'FALSE' — was result served from cache (zero Gemini cost)?
//   P qc_ran         'TRUE' / 'FALSE' — did smart-QC fire (or was it skipped)?
//
// The sheet is auto-created on first write — if "TRYON_LOG" doesn't exist
// yet, ensureSheet() inserts it with the header row, then appends.
//
// Cost / token constants are coarse estimates aligned with Google's
// late-2025 pricing tiers. They WILL drift — verify against
// Google Cloud billing periodically.

import { google, sheets_v4 } from 'googleapis'

const SHEET_TAB = 'TRYON_LOG'

const LOG_HEADERS = [
  'timestamp', 'ip', 'model', 'sku', 'variant_sku', 'attempt',
  'cap_refs', 'input_tokens', 'output_tokens', 'cost_usd',
  'elapsed_ms', 'status', 'error', 'qc_score', 'cache_hit', 'qc_ran',
] as const

// ── Pricing (USD per 1M tokens) ────────────────────────────────────────────
// Source: Google AI pricing, late 2025 (image-output flash + QC flash).
// Tweak when Google revises rates — verify at https://ai.google.dev/pricing.
const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash-image': { input: 0.30, output: 30.00 },
  'gemini-2.5-flash':       { input: 0.30, output:  2.50 },
}

// Tokens per image at default resolution. Gemini docs cite 258 for low-res
// and 1290 for high-res tiled. We send ~640px max so 1000 is a safe middle.
const TOKENS_PER_IMAGE       = 1000
const TOKENS_PER_OUTPUT_IMG  = 1290
const CHARS_PER_TOKEN        = 4

// ── Types ──────────────────────────────────────────────────────────────────

export interface UsageLogEntry {
  timestamp:    string                              // ISO 8601
  ip:           string
  model:        string
  sku?:         string
  variantSku?:  string
  attempt:      number
  capRefs:      number
  numInputImages:  number
  numOutputImages: 0 | 1
  promptChars:  number
  outputChars:  number
  elapsedMs:    number
  status:       'success' | 'qc_failed' | 'error'
  error?:       string
  qcScore?:     number | null
  /** True when the result was served from cache — no Gemini call was made
   *  and the per-call cost is effectively $0. Dashboard reports this as
   *  "saved cost" against the same baseline as fresh calls. */
  cacheHit?:    boolean
  /** True when the QC pass ran (smart-QC may skip when output looks clean). */
  qcRan?:       boolean
}

export interface UsageLogRow {
  timestamp:    string
  ip:           string
  model:        string
  sku:          string
  variantSku:   string
  attempt:      number
  capRefs:      number
  inputTokens:  number
  outputTokens: number
  costUsd:      number
  elapsedMs:    number
  status:       'success' | 'qc_failed' | 'error' | string
  error:        string
  qcScore:      number | null
  cacheHit:     boolean
  qcRan:        boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Coarse token estimate — see TOKENS_PER_IMAGE etc. constants above. */
export function estimateTokens(args: {
  numInputImages:  number
  numOutputImages: number
  promptChars:     number
  outputChars:     number
}): { input: number; output: number } {
  const input =
    args.numInputImages  * TOKENS_PER_IMAGE +
    Math.ceil(args.promptChars / CHARS_PER_TOKEN)
  const output =
    args.numOutputImages * TOKENS_PER_OUTPUT_IMG +
    Math.ceil(args.outputChars / CHARS_PER_TOKEN)
  return { input, output }
}

/** USD cost estimate from token counts at the configured pricing. */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING['gemini-2.5-flash']
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

function getSheetsClient(): sheets_v4.Sheets | null {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim()
  const privateKey  = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!clientEmail || !privateKey) return null
  const auth = new google.auth.JWT({
    email:  clientEmail,
    key:    privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

/** Create the TRYON_LOG sheet + header row if it doesn't exist yet.
 *  Safe to call repeatedly — silently no-ops when the sheet is already there. */
async function ensureSheet(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' })
  const exists = (meta.data.sheets ?? []).some(s => s.properties?.title === SHEET_TAB)
  if (exists) return

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: SHEET_TAB } } }] },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range:           `${SHEET_TAB}!A1`,
    valueInputOption:'USER_ENTERED',
    requestBody:     { values: [LOG_HEADERS as unknown as string[]] },
  })
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Append a usage log row. Idempotent against missing sheet (creates it).
 * Awaitable but designed to fail-OPEN — caller should swallow errors so a
 * sheet outage doesn't fail the try-on response itself.
 */
export async function appendUsageLog(entry: UsageLogEntry): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim()
  const sheets  = getSheetsClient()
  if (!sheetId || !sheets) {
    console.warn('[usage] Sheets env vars missing — skipping log')
    return
  }

  // Cache hits cost $0 in Gemini terms — token estimates are still useful
  // for breakdown reports, but cost MUST be zero or the dashboard will
  // double-count savings against itself.
  const isCacheHit = entry.cacheHit === true
  const { input, output } = isCacheHit
    ? { input: 0, output: 0 }
    : estimateTokens({
        numInputImages:  entry.numInputImages,
        numOutputImages: entry.numOutputImages,
        promptChars:     entry.promptChars,
        outputChars:     entry.outputChars,
      })
  const cost = isCacheHit ? 0 : estimateCostUsd(entry.model, input, output)

  await ensureSheet(sheets, sheetId)

  const row: Array<string | number | boolean> = [
    entry.timestamp,
    entry.ip || 'unknown',
    entry.model,
    entry.sku        ?? '',
    entry.variantSku ?? '',
    entry.attempt,
    entry.capRefs,
    input,
    output,
    Number(cost.toFixed(6)),
    entry.elapsedMs,
    entry.status,
    (entry.error ?? '').slice(0, 240),
    typeof entry.qcScore === 'number' ? Number(entry.qcScore.toFixed(3)) : '',
    isCacheHit ? 'TRUE' : 'FALSE',
    entry.qcRan ? 'TRUE' : 'FALSE',
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId:    sheetId,
    range:            `${SHEET_TAB}!A:P`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody:      { values: [row] },
  })
}

/**
 * Read recent log rows (most-recent first). Caps at `limit` rows — the
 * sheet may carry many months of history so we ALWAYS cap. Returns []
 * if the sheet hasn't been created yet (fresh install).
 */
export async function readUsageLog(opts: { limit?: number } = {}): Promise<UsageLogRow[]> {
  const limit   = Math.min(Math.max(opts.limit ?? 5000, 1), 50_000)
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim()
  const sheets  = getSheetsClient()
  if (!sheetId || !sheets) return []

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range:         `${SHEET_TAB}!A2:P`,   // skip header row
      valueRenderOption: 'UNFORMATTED_VALUE',
    })
    const rows = res.data.values ?? []
    // Most recent first; Sheets appends to bottom so we reverse + cap.
    const recent = rows.slice(-limit).reverse()
    return recent.map((r): UsageLogRow => ({
      timestamp:    String(r[0]  ?? ''),
      ip:           String(r[1]  ?? ''),
      model:        String(r[2]  ?? ''),
      sku:          String(r[3]  ?? ''),
      variantSku:   String(r[4]  ?? ''),
      attempt:      Number(r[5]  ?? 0),
      capRefs:      Number(r[6]  ?? 0),
      inputTokens:  Number(r[7]  ?? 0),
      outputTokens: Number(r[8]  ?? 0),
      costUsd:      Number(r[9]  ?? 0),
      elapsedMs:    Number(r[10] ?? 0),
      status:       String(r[11] ?? ''),
      error:        String(r[12] ?? ''),
      qcScore:      r[13] === '' || r[13] == null ? null : Number(r[13]),
      // cache_hit is stored as the string 'TRUE'/'FALSE' so it survives
      // Sheets' auto-formatting (a literal `true` becomes a checkbox).
      // Older rows from before the column existed → undefined → false.
      cacheHit:     r[14] === true || r[14] === 'TRUE' || r[14] === 'true',
      qcRan:        r[15] === true || r[15] === 'TRUE' || r[15] === 'true',
    }))
  } catch (e: unknown) {
    // Common case: sheet doesn't exist yet (fresh install, no try-ons logged).
    // Treat as empty rather than blowing up the dashboard.
    console.warn('[usage] readUsageLog: returning empty', e instanceof Error ? e.message : e)
    return []
  }
}
