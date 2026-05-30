import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/order
 *
 * Receives a checkout payload from the try-on result modal, validates it and
 * (optionally) forwards it to a notifier so the shop owner sees the order
 * immediately. Today the notifier is just the Vercel function log — set
 * ORDER_WEBHOOK_URL to forward to Telegram, Discord, Slack, Make.com, etc.
 *
 * The CUSTOMER side (the browser) doesn't need a backed-up database for the
 * MVP — after this responds OK the modal copies the order to the clipboard
 * and opens Zalo so the customer can paste it. That confirmation path is
 * intentionally redundant: even if the webhook is down, the order still
 * reaches the shop via Zalo.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as
      | {
          items?: unknown
          customer?: unknown
          totals?: unknown
        }
      | null

    if (!body) {
      return NextResponse.json({ ok: false, error: 'Body không hợp lệ' }, { status: 400 })
    }

    // Validate items
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

    // Validate customer
    const c = body.customer as { name?: unknown; phone?: unknown; address?: unknown; note?: unknown } | null
    if (!c) return NextResponse.json({ ok: false, error: 'Thiếu thông tin nhận hàng' }, { status: 400 })
    const customer = {
      name:    typeof c.name    === 'string' ? c.name.trim()    : '',
      phone:   typeof c.phone   === 'string' ? c.phone.trim()   : '',
      address: typeof c.address === 'string' ? c.address.trim() : '',
      note:    typeof c.note    === 'string' ? c.note.trim()    : '',
    }
    if (customer.name.length    < 2)   return NextResponse.json({ ok: false, error: 'Họ tên quá ngắn' },        { status: 400 })
    if (customer.phone.length    < 8)   return NextResponse.json({ ok: false, error: 'Số điện thoại không hợp lệ' }, { status: 400 })
    if (customer.address.length < 5)   return NextResponse.json({ ok: false, error: 'Địa chỉ quá ngắn' },       { status: 400 })

    // Recompute totals server-side as the source of truth (client values are
    // informational only — never trust a price coming from the browser).
    const subtotal = items.reduce((s, it) => s + it.unit * it.qty, 0)
    const shipping = subtotal >= 250_000 ? 0 : 30_000
    const total    = subtotal + shipping
    const qty      = items.reduce((s, it) => s + it.qty, 0)
    const totals   = { subtotal, shipping, total, qty }

    // Short, sortable order id — first 4 chars of a base36 timestamp suffix.
    // (Not cryptographic; just enough so the shop can reference it in chat.)
    const orderId = `TC${Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0')}`

    const order = { orderId, items, customer, totals, createdAt: new Date().toISOString() }

    // ── Log to Vercel function output (always) ─────────────────────────────
    console.log('[order] received', JSON.stringify(order, null, 2))

    // ── Optional webhook forwarder ─────────────────────────────────────────
    // Set ORDER_WEBHOOK_URL in Vercel env to point at:
    //   • Telegram   →  https://api.telegram.org/bot<TOKEN>/sendMessage
    //                    (then also set ORDER_WEBHOOK_CHAT_ID)
    //   • Discord    →  https://discord.com/api/webhooks/...
    //   • Slack      →  https://hooks.slack.com/services/...
    //   • Make.com   →  https://hook.make.com/...
    const webhookUrl = process.env.ORDER_WEBHOOK_URL?.trim()
    if (webhookUrl) {
      try {
        const text = formatOrderForWebhook(order)
        const payload = webhookForUrl(webhookUrl, text, order)
        const r = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!r.ok) console.warn(`[order] webhook returned HTTP ${r.status}`)
      } catch (e) {
        // Webhook failure must NOT fail the customer's order — they'll still
        // see success and reach the shop via the Zalo handoff.
        console.warn('[order] webhook forward failed:', e instanceof Error ? e.message : e)
      }
    }

    return NextResponse.json({ ok: true, orderId })

  } catch (err) {
    console.error('[order] ✗', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

interface ServerOrder {
  orderId:   string
  items:     Array<{ sku: string; name: string; unit: number; qty: number }>
  customer:  { name: string; phone: string; address: string; note: string }
  totals:    { subtotal: number; shipping: number; total: number; qty: number }
  createdAt: string
}

function formatOrderForWebhook(o: ServerOrder): string {
  const fmt = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`
  const lines = [
    `🧢 ĐƠN MỚI #${o.orderId}`,
    '',
    ...o.items.map(it => `• ${it.qty}× ${it.name} — ${fmt(it.unit * it.qty)}`),
    '',
    `Tổng: ${fmt(o.totals.total)} (ship ${o.totals.shipping === 0 ? 'free' : fmt(o.totals.shipping)})`,
    '',
    `${o.customer.name} · ${o.customer.phone}`,
    o.customer.address,
  ]
  if (o.customer.note) lines.push(`Ghi chú: ${o.customer.note}`)
  return lines.join('\n')
}

// Different webhook services want different payload shapes. Detect by URL.
function webhookForUrl(url: string, text: string, raw: ServerOrder): Record<string, unknown> {
  if (url.includes('api.telegram.org/bot')) {
    const chatId = process.env.ORDER_WEBHOOK_CHAT_ID?.trim()
    return { chat_id: chatId, text, parse_mode: 'Markdown' }
  }
  if (url.includes('discord.com/api/webhooks')) {
    return { content: text }
  }
  if (url.includes('hooks.slack.com')) {
    return { text }
  }
  // Make.com / Zapier / generic — send the raw order object so the user can
  // map fields freely on their side.
  return { text, order: raw }
}
