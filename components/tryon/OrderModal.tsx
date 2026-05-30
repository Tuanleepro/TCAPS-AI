'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { PRODUCTS, type Product } from '@/constants/products'
import { proxyImg } from '@/lib/img'

// ─── Pricing ───────────────────────────────────────────────────────────────
// Each item priced at its own priceBundle (most products = 160k or 130k).
// Shipping = 30k COD nationwide, free when the cart total is ≥ 250k (this is
// the promo the homepage already advertises: "Mua 2 nón + free ship 250k/2").
const COD_SHIPPING       = 30_000
const FREE_SHIP_THRESHOLD = 250_000
const fmt = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`

// Pickable products only — same filter the catalog page uses.
const PICKABLE = PRODUCTS.filter(p => p.imageUrl)

// Normaliser for diacritic-insensitive name search (matches the existing
// hat-picker behaviour on the upload page).
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

interface CartItem {
  sku:  string
  name: string
  unit: number          // unit price (priceBundle)
  qty:  number
  thumb: string
}

interface Props {
  open:     boolean
  product:  Product            // the cap the user just tried on (always row 0)
  onClose:  () => void
}

export function OrderModal({ open, product, onClose }: Props) {
  // ── Cart state ───────────────────────────────────────────────────────────
  const initialItem: CartItem = useMemo(() => ({
    sku:   product.sku,
    name:  product.name,
    unit:  product.priceBundle,
    qty:   1,
    thumb: product.imageUrl,
  }), [product])

  const [items,    setItems]    = useState<CartItem[]>([initialItem])
  const [showAdd,  setShowAdd]  = useState(false)
  const [addQuery, setAddQuery] = useState('')

  // ── Form state ───────────────────────────────────────────────────────────
  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [address, setAddress] = useState('')
  const [note,    setNote]    = useState('')

  const [submit, setSubmit] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [submitErr, setSubmitErr] = useState<string | null>(null)

  // Ref to the scrollable body — used to forward wheel events from anywhere
  // on the dim overlay into the modal scroll, so desktop users wheel-scrolling
  // outside the modal still reach the submit button at the bottom.
  const bodyRef = useRef<HTMLDivElement>(null)

  // Reset to a fresh cart when the modal opens for a new product.
  useEffect(() => {
    if (open) {
      setItems([initialItem])
      setShowAdd(false)
      setAddQuery('')
      setSubmit('idle')
      setSubmitErr(null)
    }
  }, [open, initialItem])

  // Body scroll lock + Esc-to-close while the modal is open. Also flips a
  // `data-modal-open` flag on <body> so the floating Zalo/Messenger bubbles
  // can hide themselves via CSS (their fixed positioning otherwise composites
  // on top of the modal in some iOS in-app browsers).
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.dataset.modalOpen = 'true'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      delete document.body.dataset.modalOpen
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const subtotal = items.reduce((s, it) => s + it.unit * it.qty, 0)
  const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : COD_SHIPPING
  const total    = subtotal + shipping
  const totalQty = items.reduce((s, it) => s + it.qty, 0)

  // ── Cart mutations ───────────────────────────────────────────────────────
  const bumpQty = useCallback((sku: string, delta: number) => {
    setItems(prev => prev.flatMap(it => {
      if (it.sku !== sku) return [it]
      const next = it.qty + delta
      if (next <= 0) return it.sku === product.sku ? [{ ...it, qty: 1 }] : []  // don't let the primary item drop to 0
      return [{ ...it, qty: next }]
    }))
  }, [product.sku])

  const removeItem = useCallback((sku: string) => {
    if (sku === product.sku) return    // primary item is locked in
    setItems(prev => prev.filter(it => it.sku !== sku))
  }, [product.sku])

  const addProduct = useCallback((p: Product) => {
    setItems(prev => {
      const existing = prev.find(it => it.sku === p.sku)
      if (existing) return prev.map(it => it.sku === p.sku ? { ...it, qty: it.qty + 1 } : it)
      return [...prev, { sku: p.sku, name: p.name, unit: p.priceBundle, qty: 1, thumb: p.imageUrl }]
    })
    setShowAdd(false)
    setAddQuery('')
  }, [])

  const filteredAdd = useMemo(() => {
    const q = norm(addQuery.trim())
    const taken = new Set(items.map(it => it.sku))
    const pool  = PICKABLE.filter(p => !taken.has(p.sku))
    if (!q) return pool.slice(0, 30)
    return pool.filter(p => norm(p.name).includes(q) || norm(p.sku).includes(q)).slice(0, 30)
  }, [addQuery, items])

  // ── Submit ───────────────────────────────────────────────────────────────
  const canSubmit =
    submit !== 'submitting' &&
    name.trim().length    >= 2 &&
    /^[\d\s+().-]{8,}$/.test(phone.trim()) &&
    address.trim().length >= 5 &&
    items.length          >= 1

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSubmit('submitting')
    setSubmitErr(null)
    try {
      const payload = {
        items:    items.map(({ sku, name: n, unit, qty }) => ({ sku, name: n, unit, qty })),
        customer: { name: name.trim(), phone: phone.trim(), address: address.trim(), note: note.trim() },
        totals:   { subtotal, shipping, total, qty: totalQty },
      }
      const r = await fetch('/api/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const d = await r.json().catch(() => null) as { ok?: boolean; orderId?: string; error?: string } | null
      if (!r.ok || !d?.ok) throw new Error(d?.error || `HTTP ${r.status}`)

      // Build a human-readable order summary + copy it. Customer can then paste
      // it into Zalo for confirmation (Zalo personal numbers don't support
      // URL-based prefill, so clipboard is the path of least friction).
      const summary = buildOrderText(payload, d.orderId)
      try { await navigator.clipboard.writeText(summary) } catch { /* clipboard unsupported */ }
      window.open('https://zalo.me/0972284146', '_blank', 'noopener,noreferrer')
      setSubmit('success')
    } catch (e) {
      setSubmit('error')
      setSubmitErr(e instanceof Error ? e.message : 'Gửi đơn lỗi. Vui lòng thử lại.')
    }
  }, [canSubmit, items, name, phone, address, note, subtotal, shipping, total, totalQty])

  if (!open) return null

  return (
    // z-[100] keeps the modal above the floating Zalo/Messenger bubbles
    // (z-40). Some iOS in-app browsers (Messenger / Zalo / TikTok) compose
    // fixed elements onto their own layers and a 10-step gap isn't always
    // enough, so use a big margin. The overlay's onClick closes; inner
    // onClick stops propagation. onWheel forwards scroll events from the
    // dim overlay into the modal body so a desktop user wheel-scrolling
    // anywhere on the screen still reaches the submit button at the bottom
    // (without this, mousing over the backdrop hits a body-scroll-locked
    // page and nothing happens — the customer gets stuck).
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      onWheel={(e) => {
        if (!bodyRef.current) return
        // Only forward when the wheel is OUTSIDE the modal body, otherwise
        // we'd double-apply the scroll and the page would jerk.
        const target = e.target as HTMLElement
        if (bodyRef.current.contains(target)) return
        bodyRef.current.scrollTop += e.deltaY
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Đặt hàng TCAPS"
    >
      {/* Fixed height across breakpoints — explicit h-[88vh] so the modal is
          always shorter than the viewport with the submit footer pinned to
          its bottom. `vh` (not `dvh`) for safe fallback in iOS webviews /
          Messenger / Zalo in-app browsers where dynamic viewport units
          silently drop the height constraint. Desktop also caps at 720px so
          the modal doesn't get awkwardly tall on big monitors. */}
      <div
        className="w-full h-[88vh] sm:max-w-md sm:h-[min(720px,88vh)] bg-[#0D0D0D] border-t sm:border border-[#2A2A2A] sm:rounded-2xl shadow-[0_-12px_48px_rgba(0,0,0,.6)] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E1E] shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-[.18em] text-[#C9A84C]">Đặt nón TCAPS</p>
            <h3 className="text-base font-black text-[#F5F5F5]">Xác nhận đơn hàng</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-lg border border-[#2A2A2A] flex items-center justify-center text-[#8A8A8A] hover:text-[#F5F5F5] hover:border-[#C9A84C]/40"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body. `min-h-0` is critical: without it, the flex item
            defaults to `min-height: auto` and refuses to shrink below content
            size, so the overflow-y-auto never triggers and the form / footer
            get pushed out of the modal. The `modal-scrollbar` class (in
            globals.css) gives this scroll area a visible gold scrollbar so
            customers immediately see they CAN scroll — without that visual
            cue desktop users were trying to wheel-scroll the locked page
            outside the modal and giving up. */}
        <div ref={bodyRef} className="modal-scrollbar overflow-y-auto px-4 py-4 flex flex-col gap-5 flex-1 min-h-0">

          {submit === 'success' ? (
            <SuccessPanel onClose={onClose} subtotal={subtotal} qty={totalQty} />
          ) : (
            <>
              {/* Cart */}
              <section className="flex flex-col gap-2">
                <p className="text-[10px] uppercase tracking-[.18em] text-[#C9A84C]">Giỏ hàng</p>
                <div className="flex flex-col gap-2">
                  {items.map((it, i) => (
                    <CartRow
                      key={it.sku}
                      item={it}
                      locked={i === 0}
                      onMinus={() => bumpQty(it.sku, -1)}
                      onPlus={() => bumpQty(it.sku, +1)}
                      onRemove={() => removeItem(it.sku)}
                    />
                  ))}
                </div>

                {/* Add more */}
                {!showAdd ? (
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="mt-1 h-11 rounded-xl border border-dashed border-[#C9A84C]/30 hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/6 text-[#C9A84C] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    Mua thêm nón khác
                  </button>
                ) : (
                  <AddMorePicker
                    query={addQuery}
                    onQuery={setAddQuery}
                    products={filteredAdd}
                    onPick={addProduct}
                    onCancel={() => { setShowAdd(false); setAddQuery('') }}
                  />
                )}
              </section>

              {/* Customer form */}
              <section className="flex flex-col gap-2">
                <p className="text-[10px] uppercase tracking-[.18em] text-[#C9A84C]">Thông tin nhận hàng</p>
                <Field label="Họ tên"        value={name}    onChange={setName}    placeholder="Nguyễn Văn A" />
                <Field label="Số điện thoại" value={phone}   onChange={setPhone}   placeholder="0972 284 146" inputMode="tel" required />
                <Field label="Địa chỉ giao hàng" value={address} onChange={setAddress} placeholder="332 Lê Văn Việt, TP. Hồ Chí Minh" required />
                <FieldTextarea label="Ghi chú (tuỳ chọn)" value={note} onChange={setNote} placeholder="Size, màu chính xác, giờ giao..." />
              </section>
            </>
          )}
        </div>

        {/* Sticky footer */}
        {submit !== 'success' && (
          <div className="border-t border-[#1E1E1E] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shrink-0">
            <PriceBreakdown subtotal={subtotal} shipping={shipping} total={total} qty={totalQty} />
            {submitErr && (
              <p className="text-[12px] text-[#E05252] mt-2">{submitErr}</p>
            )}
            <button
              onClick={onSubmit}
              disabled={!canSubmit}
              className="mt-3 w-full h-12 rounded-xl bg-[#C9A84C] hover:bg-[#E8C96A] active:bg-[#C9A84C] text-black font-black text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submit === 'submitting' ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,.2)" strokeWidth="3" />
                    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  ĐANG GỬI…
                </>
              ) : (
                <>ĐẶT HÀNG · {fmt(total)}</>
              )}
            </button>
            <p className="text-[10px] text-[#5A5A5A] text-center mt-2">
              Thanh toán COD · TCAPS sẽ xác nhận qua Zalo trong vài phút
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function CartRow({
  item, locked, onMinus, onPlus, onRemove,
}: {
  item: CartItem; locked: boolean
  onMinus: () => void; onPlus: () => void; onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl border border-[#1E1E1E] bg-[#0A0A0A]">
      <div className="w-14 h-14 rounded-lg border border-[#2A2A2A] bg-[#0D0D0D] overflow-hidden shrink-0 relative">
        {item.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxyImg(item.thumb, 128)} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#4A4A4A] text-lg">🧢</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#F5F5F5] leading-tight line-clamp-2">{item.name}</p>
        <p className="text-xs text-[#C9A84C] font-mono mt-0.5">{fmt(item.unit)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button" onClick={onMinus}
          aria-label="Giảm số lượng"
          className="w-8 h-8 rounded-md border border-[#2A2A2A] text-[#C9A84C] hover:bg-[#C9A84C]/10 flex items-center justify-center font-bold"
        >−</button>
        <span className="w-6 text-center text-sm font-bold text-[#F5F5F5] tabular-nums">{item.qty}</span>
        <button
          type="button" onClick={onPlus}
          aria-label="Tăng số lượng"
          className="w-8 h-8 rounded-md border border-[#2A2A2A] text-[#C9A84C] hover:bg-[#C9A84C]/10 flex items-center justify-center font-bold"
        >+</button>
        {!locked && (
          <button
            type="button" onClick={onRemove}
            aria-label="Xoá khỏi giỏ"
            className="ml-1 w-8 h-8 rounded-md border border-[#2A2A2A] text-[#8A8A8A] hover:text-[#E05252] hover:border-[#E05252]/40 flex items-center justify-center"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

function AddMorePicker({
  query, onQuery, products, onPick, onCancel,
}: {
  query: string; onQuery: (v: string) => void
  products: Product[]
  onPick: (p: Product) => void
  onCancel: () => void
}) {
  return (
    <div className="mt-1 rounded-xl border border-[#C9A84C]/40 bg-[#0D0D0D] p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-[#222] bg-[#111] focus-within:border-[#C9A84C]/60">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#6B6B6B]">
          <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9.2 9.2L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder="Tìm nón…"
          className="flex-1 min-w-0 bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#6B6B6B] outline-none"
          autoFocus
        />
        <button
          type="button" onClick={onCancel}
          className="text-[10px] uppercase tracking-widest text-[#8A8A8A] hover:text-[#F5F5F5]"
        >Huỷ</button>
      </div>

      <div className="max-h-[260px] overflow-y-auto pr-1 flex flex-col gap-1">
        {products.length === 0 ? (
          <p className="text-xs text-[#6B6B6B] py-3 text-center">Không tìm thấy nón nào.</p>
        ) : products.map(p => (
          <button
            key={p.sku}
            type="button"
            onClick={() => onPick(p)}
            className="flex items-center gap-3 p-2 rounded-lg border border-[#1E1E1E] hover:border-[#C9A84C]/40 hover:bg-[#C9A84C]/6 text-left"
          >
            <div className="w-10 h-10 rounded-md bg-[#0A0A0A] overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proxyImg(p.imageUrl, 80)} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-[#F5F5F5] truncate">{p.name}</p>
              <p className="text-[11px] text-[#C9A84C] font-mono">{fmt(p.priceBundle)}</p>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#C9A84C] shrink-0">Thêm</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, required, inputMode,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean
  inputMode?: 'text' | 'tel' | 'email'
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-[#8A8A8A]">
        {label}{required && <span className="text-[#C9A84C]"> *</span>}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-11 px-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] text-sm text-[#F5F5F5] placeholder:text-[#4A4A4A] outline-none focus:border-[#C9A84C]/60"
      />
    </label>
  )
}

function FieldTextarea({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-[#8A8A8A]">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="px-3 py-2 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] text-sm text-[#F5F5F5] placeholder:text-[#4A4A4A] outline-none focus:border-[#C9A84C]/60 resize-none"
      />
    </label>
  )
}

function PriceBreakdown({
  subtotal, shipping, total, qty,
}: { subtotal: number; shipping: number; total: number; qty: number }) {
  return (
    <div className="flex flex-col gap-1 text-[13px]">
      <Row label={`Tạm tính (${qty} nón)`} value={fmt(subtotal)} />
      <Row
        label="Ship COD"
        value={shipping === 0 ? <span className="text-[#C9A84C]">Miễn phí</span> : fmt(shipping)}
      />
      <div className="border-t border-[#1E1E1E] my-1" />
      <Row label="Tổng cộng" value={<span className="text-[#C9A84C] font-mono font-black text-base">{fmt(total)}</span>} bold />
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={bold ? 'font-bold text-[#F5F5F5]' : 'text-[#8A8A8A]'}>{label}</span>
      <span className={bold ? '' : 'text-[#F5F5F5] font-mono'}>{value}</span>
    </div>
  )
}

function SuccessPanel({ onClose, subtotal, qty }: { onClose: () => void; subtotal: number; qty: number }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-6 fade-in-up">
      <div className="w-14 h-14 rounded-full bg-[#C9A84C]/12 border border-[#C9A84C]/40 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4 4 10-10" stroke="#C9A84C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div>
        <h4 className="text-lg font-black text-[#F5F5F5]">Đã ghi nhận đơn của bạn!</h4>
        <p className="text-[13px] text-[#8A8A8A] mt-1">{qty} nón · {fmt(subtotal)} (chưa gồm ship)</p>
      </div>
      <p className="text-[13px] text-[#C8C8C8] leading-relaxed max-w-xs">
        Đơn đã được copy. Tab Zalo TCAPS vừa mở — paste vào chat để TCAPS xác nhận nhanh nhất.
      </p>
      <button
        onClick={onClose}
        className="mt-2 h-11 px-6 rounded-xl border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10 font-bold text-xs uppercase tracking-widest"
      >
        Đóng
      </button>
    </div>
  )
}

// ── Order text builder (for clipboard) ─────────────────────────────────────

interface OrderPayload {
  items:    Array<{ sku: string; name: string; unit: number; qty: number }>
  customer: { name: string; phone: string; address: string; note: string }
  totals:   { subtotal: number; shipping: number; total: number; qty: number }
}

function buildOrderText(p: OrderPayload, orderId?: string): string {
  const lines = [
    `🧢 ĐƠN HÀNG TCAPS${orderId ? ` #${orderId}` : ''}`,
    '',
    '— Sản phẩm —',
    ...p.items.map(it => `• ${it.qty}× ${it.name} — ${fmt(it.unit * it.qty)}`),
    '',
    `Tạm tính (${p.totals.qty} nón): ${fmt(p.totals.subtotal)}`,
    `Ship COD: ${p.totals.shipping === 0 ? 'Miễn phí' : fmt(p.totals.shipping)}`,
    `TỔNG: ${fmt(p.totals.total)}`,
    '',
    '— Người nhận —',
    `Họ tên: ${p.customer.name}`,
    `SĐT: ${p.customer.phone}`,
    `Địa chỉ: ${p.customer.address}`,
  ]
  if (p.customer.note) lines.push(`Ghi chú: ${p.customer.note}`)
  return lines.join('\n')
}
