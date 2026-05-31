import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { calculatePricing } from '@/lib/pricing'

export const runtime = 'nodejs'

/**
 * POST /api/order
 *
 * Appends one row to the TCAPS Google Sheet — that's the entire order
 * pipeline. No database, no Telegram, no email. The shop owner watches the
 * sheet for new rows and updates column I (Trạng thái) as they process.
 *
 * Sheet layout (one row per order, append to bottom):
 *   A  Thời gian          — VN locale timestamp
 *   B  Họ tên
 *   C  Số điện thoại      — leading 0 preserved (we send as text)
 *   D  Địa chỉ            — street + province joined
 *   E  Sản phẩm chính     — "TC67 × 1 (160.000₫)"
 *   F  Sản phẩm mua thêm  — "TC68 × 1 (160.000₫); TC66 × 1 (160.000₫)"
 *   G  Tổng tiền          — number, so Sheets can SUM / filter
 *   H  Ghi chú
 *   I  Trạng thái         — defaults to "Chưa xử lý"
 *   J  Nguồn              — always "TCAPS AI"
 *
 * Required env:
 *   GOOGLE_SHEET_ID       — the spreadsheet ID from the URL
 *   GOOGLE_CLIENT_EMAIL   — service account email
 *   GOOGLE_PRIVATE_KEY    — service account PEM (newlines as \n)
 *
 * See GOOGLE_SHEET_SETUP.md for the one-time setup walkthrough.
 */
export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse + validate payload ───────────────────────────────────────
    const body = await req.json().catch(() => null) as
      | { items?: unknown; customer?: unknown }
      | null

    if (!body) {
      return NextResponse.json({ ok: false, error: 'Body không hợp lệ' }, { status: 400 })
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ ok: false, error: 'Giỏ hàng trống' }, { status: 400 })
    }
    const items = body.items.map((raw, idx) => {
      const it = raw as { sku?: unknown; name?: unknown; unit?: unknown; qty?: unknown }
      if (typeof it.sku !== 'string' || typeof it.name !== 'string' ||
          typeof it.unit !== 'number' || typeof it.qty !== 'number') {
        throw new Error(`Sản phẩm ${idx + 1} thiếu thông tin`)
      }
      if (it.qty < 1 || it.qty > 99) throw new Error(`Số lượng nón ${idx + 1} không hợp lệ`)
      return { sku: it.sku, name: it.name, unit: Math.round(it.unit), qty: Math.round(it.qty) }
    })

    const c = body.customer as
      { name?: unknown; phone?: unknown; address?: unknown; province?: unknown; note?: unknown }
      | null
    if (!c) return NextResponse.json({ ok: false, error: 'Thiếu thông tin nhận hàng' }, { status: 400 })
    const customer = {
      name:     typeof c.name     === 'string' ? c.name.trim()     : '',
      phone:    typeof c.phone    === 'string' ? c.phone.trim()    : '',
      address:  typeof c.address  === 'string' ? c.address.trim()  : '',
      province: typeof c.province === 'string' ? c.province.trim() : '',
      note:     typeof c.note     === 'string' ? c.note.trim()     : '',
    }
    if (customer.name.length    < 2) return NextResponse.json({ ok: false, error: 'Họ tên quá ngắn' },             { status: 400 })
    if (customer.phone.length   < 8) return NextResponse.json({ ok: false, error: 'Số điện thoại không hợp lệ' }, { status: 400 })
    if (customer.address.length < 5) return NextResponse.json({ ok: false, error: 'Địa chỉ quá ngắn' },           { status: 400 })

    // ── 2. Recompute totals server-side (never trust browser prices) ─────
    // Tier pricing lives in lib/pricing.ts so client + server can't drift.
    // The per-row `unit` from the browser is informational only at this point;
    // calculatePricing(qty) is the authoritative total.
    const totalQty = items.reduce((s, it) => s + it.qty, 0)
    const pricing  = calculatePricing(totalQty)
    const subtotal = pricing.subtotal
    const shipping = pricing.shipping
    const total    = pricing.total
    const bonusQty = pricing.bonusQty

    // ── 3. Build the row to append ───────────────────────────────────────
    const fmt = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`
    const timestamp = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day:    '2-digit', month: '2-digit', year:  'numeric',
      hour:   '2-digit', minute:'2-digit', second:'2-digit',
      hour12: false,
    }).format(new Date())

    const [first, ...rest] = items
    const mainProduct = `${first.name} × ${first.qty} (${fmt(first.unit * first.qty)})`
    const addProducts = rest.length
      ? rest.map(it => `${it.name} × ${it.qty} (${fmt(it.unit * it.qty)})`).join('; ')
      : ''
    const fullAddress = customer.province
      ? `${customer.address}, ${customer.province}`
      : customer.address

    // Column order MUST match the spec exactly so the sheet's existing
    // header row keeps aligning.
    // When the tier qualifies for a bonus cap, prepend a 🎁 marker to the
    // Ghi chú column so the shop owner sees it at a glance when processing.
    const note = bonusQty > 0
      ? `🎁 Tặng +${bonusQty} nón${customer.note ? ` · ${customer.note}` : ''}`
      : customer.note
    const row: Array<string | number> = [
      timestamp,            // A — Thời gian
      customer.name,        // B — Họ tên
      customer.phone,       // C — Số điện thoại (text, leading zero kept)
      fullAddress,          // D — Địa chỉ
      mainProduct,          // E — Sản phẩm chính
      addProducts,          // F — Sản phẩm mua thêm
      total,                // G — Tổng tiền (number)
      note,                 // H — Ghi chú (with bonus marker if applicable)
      'Chưa xử lý',         // I — Trạng thái
      'TCAPS AI',           // J — Nguồn
    ]

    // ── 4. Append to Google Sheet ────────────────────────────────────────
    const sheetId = process.env.GOOGLE_SHEET_ID?.trim()
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL?.trim()
    // The private key is stored with literal "\n" sequences in env vars;
    // restore the real newlines before handing it to the JWT signer.
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!sheetId || !clientEmail || !privateKey) {
      console.error('[order] Google Sheets env vars missing', {
        hasSheetId: !!sheetId, hasEmail: !!clientEmail, hasKey: !!privateKey,
      })
      return NextResponse.json(
        { ok: false, error: 'Không thể gửi đơn hàng. Vui lòng thử lại.' },
        { status: 500 },
      )
    }

    const auth = new google.auth.JWT({
      email:  clientEmail,
      key:    privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const sheets = google.sheets({ version: 'v4', auth })

    await sheets.spreadsheets.values.append({
      spreadsheetId:    sheetId,
      range:            'A:J',            // append to the first sheet's columns A through J
      valueInputOption: 'USER_ENTERED',   // lets Sheets parse the timestamp as a real date
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    })

    console.log('[order] sheet append OK', { timestamp, customer: customer.name, total })
    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[order] ✗', err)
    return NextResponse.json(
      { ok: false, error: 'Không thể gửi đơn hàng. Vui lòng thử lại.' },
      { status: 500 },
    )
  }
}
