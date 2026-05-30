import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/order
 *
 * Receives a checkout payload from the try-on result modal, validates it and
 * (optionally) forwards it to a notifier so the shop owner sees the order
 * immediately. By default the notifier is just the Vercel function log — set
 * `ORDER_WEBHOOK_URL` in Vercel env to forward to Telegram, Discord, Slack,
 * Make.com, etc. (URL pattern detected automatically; see webhookForUrl).
 *
 * Recompute totals SERVER-SIDE: never trust prices coming from the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as
      | {
          items?: unknown
          customer?: unknown
        }
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
    if (customer.name.length     < 2) return NextResponse.json({ ok: false, error: 'Họ tên quá ngắn' },             { status: 400 })
    if (customer.phone.length    < 8) return NextResponse.json({ ok: false, error: 'Số điện thoại không hợp lệ' }, { status: 400 })
    if (customer.address.length  < 5) return NextResponse.json({ ok: false, error: 'Địa chỉ quá ngắn' },           { status: 400 })
    if (customer.province.length < 2) return NextResponse.json({ ok: false, error: 'Tỉnh / Thành phố quá ngắn' },  { status: 400 })

    // Server-side totals.
    const subtotal = items.reduce((s, it) => s + it.unit * it.qty, 0)
    const shipping = subtotal >= 250_000 ? 0 : 30_000
    const total    = subtotal + shipping
    const qty      = items.reduce((s, it) => s + it.qty, 0)

    // Short, customer-friendly id. Not cryptographic — just enough for the
    // shop to reference the order in chat.
    const orderId = `TC${Math.floor(Math.random() * 36 ** 5).toString(36).toUpperCase().padStart(5, '0')}`

    const order = {
      orderId,
      items,
      customer,
      totals: { subtotal, shipping, total, qty },
      createdAt: new Date().toISOString(),
    }

    console.log('[order] received', JSON.stringify(order, null, 2))

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
        // Don't fail the customer's order if the webhook is down.
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
  customer:  { name: string; phone: string; address: string; province: string; note: string }
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
    `${o.customer.address}, ${o.customer.province}`,
  ]
  if (o.customer.note) lines.push(`Ghi chú: ${o.customer.note}`)
  return lines.join('\n')
}

// Different webhook services want different payload shapes. Detect by URL.
function webhookForUrl(url: string, text: string, raw: ServerOrder): Record<string, unknown> {
  if (url.includes('api.telegram.org/bot')) {
    const chatId = process.env.ORDER_WEBHOOK_CHAT_ID?.trim()
    return { chat_id: chatId, text }
  }
  if (url.includes('discord.com/api/webhooks')) {
    return { content: text }
  }
  if (url.includes('hooks.slack.com')) {
    return { text }
  }
  // Make.com / Zapier / generic.
  return { text, order: raw }
}
