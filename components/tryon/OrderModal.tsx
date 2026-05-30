'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PRODUCTS, type Product } from '@/constants/products'
import { proxyImg } from '@/lib/img'

// ── Pricing & shipping ─────────────────────────────────────────────────────
const COD_SHIPPING        = 30_000
const FREE_SHIP_THRESHOLD = 250_000
const fmt = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`

const PICKABLE = PRODUCTS.filter(p => p.imageUrl)

// Featured upsell — 6 caps shown by default in the "Mua thêm" section.
// Picked from the top of the catalog (the latest / hero products); the current
// cap is filtered out at render time so the customer never sees it twice.
const UPSELL_POOL = PICKABLE.slice(0, 8)

// Social-proof bullets shown beside the confirm CTA. Static; the underlying
// numbers are what TCAPS already advertises on TikTok / Pancake.
const SOCIAL_PROOF: Array<{ icon: string; text: string }> = [
  { icon: '⭐', text: 'Hơn 150.000+ nón đã được bán'   },
  { icon: '⭐', text: 'Đánh giá trung bình 4.8/5'      },
  { icon: '🛡️', text: 'Bảo hành 30 ngày từ ngày nhận' },
  { icon: '🔄', text: 'Đổi trả nếu lỗi sản xuất'      },
]

// ── Types ──────────────────────────────────────────────────────────────────

interface OrderItem {
  sku:    string
  name:   string
  unit:   number
  qty:    number
  thumb:  string
}

interface Props {
  open:    boolean
  product: Product   // the cap the customer just tried on — always the primary item
  onClose: () => void
}

// ── Component ──────────────────────────────────────────────────────────────

export function OrderModal({ open, product, onClose }: Props) {
  // Primary item (locked, can change qty but not remove).
  const primary: OrderItem = useMemo(() => ({
    sku:   product.sku,
    name:  product.name,
    unit:  product.priceBundle,
    qty:   1,
    thumb: product.imageUrl,
  }), [product])

  const [primaryQty, setPrimaryQty] = useState(1)
  const [extras,     setExtras]     = useState<Set<string>>(new Set())  // SKUs ticked

  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [address,  setAddress]  = useState('')
  const [province, setProvince] = useState('')
  const [note,     setNote]     = useState('')

  const [status,    setStatus]    = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [statusErr, setStatusErr] = useState<string | null>(null)

  const bodyRef = useRef<HTMLDivElement>(null)

  // Reset on re-open with a different product.
  useEffect(() => {
    if (open) {
      setPrimaryQty(1)
      setExtras(new Set())
      setStatus('idle')
      setStatusErr(null)
    }
  }, [open, product.sku])

  // iOS-safe body scroll lock + Esc-to-close + data-modal-open flag.
  // See the inline comment below for why plain `overflow: hidden` isn't enough
  // on iOS in-app browsers (position:fixed children get anchored to the
  // document scroll position rather than the visual viewport).
  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top:      document.body.style.top,
      left:     document.body.style.left,
      right:    document.body.style.right,
      width:    document.body.style.width,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top      = `-${scrollY}px`
    document.body.style.left     = '0'
    document.body.style.right    = '0'
    document.body.style.width    = '100%'
    document.body.dataset.modalOpen = 'true'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev.overflow
      document.body.style.position = prev.position
      document.body.style.top      = prev.top
      document.body.style.left     = prev.left
      document.body.style.right    = prev.right
      document.body.style.width    = prev.width
      delete document.body.dataset.modalOpen
      window.scrollTo(0, scrollY)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // ── Cart math ──────────────────────────────────────────────────────────
  const upsellItems = useMemo(
    () => UPSELL_POOL.filter(p => p.sku !== product.sku),
    [product.sku],
  )
  const extraItems: OrderItem[] = useMemo(
    () => upsellItems
      .filter(p => extras.has(p.sku))
      .map(p => ({ sku: p.sku, name: p.name, unit: p.priceBundle, qty: 1, thumb: p.imageUrl })),
    [upsellItems, extras],
  )
  const allItems: OrderItem[] = useMemo(
    () => [{ ...primary, qty: primaryQty }, ...extraItems],
    [primary, primaryQty, extraItems],
  )
  const subtotal = allItems.reduce((s, it) => s + it.unit * it.qty, 0)
  const shipping = subtotal >= FREE_SHIP_THRESHOLD ? 0 : COD_SHIPPING
  const total    = subtotal + shipping
  const totalQty = allItems.reduce((s, it) => s + it.qty, 0)

  const toggleExtra = useCallback((sku: string) => {
    setExtras(prev => {
      const next = new Set(prev)
      if (next.has(sku)) next.delete(sku); else next.add(sku)
      return next
    })
  }, [])

  // ── Validation + submit ────────────────────────────────────────────────
  const canSubmit =
    status !== 'submitting' &&
    name.trim().length     >= 2 &&
    /^[\d\s+().-]{8,}$/.test(phone.trim()) &&
    address.trim().length  >= 5 &&
    province.trim().length >= 2

  const onSubmit = useCallback(async () => {
    if (!canSubmit) return
    setStatus('submitting')
    setStatusErr(null)
    try {
      const payload = {
        items:    allItems.map(({ sku, name: n, unit, qty }) => ({ sku, name: n, unit, qty })),
        customer: {
          name:     name.trim(),
          phone:    phone.trim(),
          address:  address.trim(),
          province: province.trim(),
          note:     note.trim(),
        },
        totals:   { subtotal, shipping, total, qty: totalQty },
      }
      const r = await fetch('/api/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const d = await r.json().catch(() => null) as { ok?: boolean; error?: string } | null
      if (!r.ok || !d?.ok) throw new Error(d?.error || `HTTP ${r.status}`)
      setStatus('success')
    } catch (e) {
      setStatus('error')
      setStatusErr(e instanceof Error ? e.message : 'Không thể gửi đơn hàng. Vui lòng thử lại.')
    }
  }, [canSubmit, allItems, name, phone, address, province, note, subtotal, shipping, total, totalQty])

  if (!open) return null
  // Portal to document.body so the modal escapes every transformed/filtered
  // ancestor in the render tree. ResultPanel (and a few other containers in
  // this app) animate with `transform: translateY(...)`, which leaves a
  // non-`none` transform on the element after the animation finishes —
  // per CSS spec that creates a CONTAINING BLOCK for any `position: fixed`
  // descendant, so the modal anchors to ResultPanel instead of the viewport
  // and renders off-centre. Portaling to <body> fixes this for good.
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md"
      onClick={onClose}
      onWheel={(e) => {
        // Forward wheel events from anywhere on the overlay into the modal
        // body so desktop customers wheel-scrolling outside the modal still
        // reach the confirm CTA at the bottom.
        if (!bodyRef.current) return
        const target = e.target as HTMLElement
        if (bodyRef.current.contains(target)) return
        bodyRef.current.scrollTop += e.deltaY
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Đặt hàng TCAPS"
    >
      <div
        className="w-full h-[92vh] sm:h-[820px] sm:max-h-[90vh] sm:max-w-2xl sm:mx-auto bg-gradient-to-b from-[#0D0D0D] to-[#0A0A0A] border-t-2 sm:border-2 border-[#C9A84C]/40 sm:rounded-3xl shadow-[0_-12px_80px_rgba(201,168,76,.15)] flex flex-col overflow-hidden modal-fade-in"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 'min(640px, 100vw)' }}
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#C9A84C]/15 shrink-0 bg-gradient-to-r from-[#C9A84C]/6 to-transparent">
          <div>
            <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] font-bold">Đặt nón TCAPS</p>
            <h3 className="text-lg sm:text-xl font-black text-[#F5F5F5] tracking-tight">Xác nhận đơn hàng</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-10 h-10 rounded-xl border border-[#2A2A2A] hover:border-[#C9A84C]/60 bg-[#0A0A0A] flex items-center justify-center text-[#8A8A8A] hover:text-[#C9A84C] transition-all duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2.5 2.5l11 11M13.5 2.5l-11 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div ref={bodyRef} className="modal-scrollbar overflow-y-auto flex-1 min-h-0 px-5 py-5 flex flex-col gap-6">

          {status === 'success' ? (
            <SuccessPanel onClose={onClose} qty={totalQty} total={total} />
          ) : (
            <>
              {/* PART 1 — Selected product */}
              <PrimaryProductCard
                product={product}
                qty={primaryQty}
                onMinus={() => setPrimaryQty(q => Math.max(1, q - 1))}
                onPlus={() => setPrimaryQty(q => Math.min(99, q + 1))}
              />

              {/* PART 2 — Customer info form */}
              <section>
                <SectionTitle>Thông tin nhận hàng</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Họ và tên" required
                    value={name} onChange={setName}
                    placeholder="Nguyễn Văn A"
                    autoComplete="name"
                  />
                  <Field
                    label="Số điện thoại" required
                    value={phone} onChange={setPhone}
                    placeholder="0972 284 146"
                    inputMode="tel" autoComplete="tel"
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label="Địa chỉ" required
                      value={address} onChange={setAddress}
                      placeholder="Số nhà, đường, phường/xã"
                      autoComplete="street-address"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Tỉnh / Thành phố" required
                      value={province} onChange={setProvince}
                      placeholder="TP. Hồ Chí Minh"
                      autoComplete="address-level1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldTextarea
                      label="Ghi chú đơn hàng (tuỳ chọn)"
                      value={note} onChange={setNote}
                      placeholder="Size, màu chính xác, giờ giao..."
                    />
                  </div>
                </div>
              </section>

              {/* PART 3 — Upsell */}
              {upsellItems.length > 0 && (
                <section>
                  <SectionTitle>🔥 Mua thêm để tiết kiệm phí ship</SectionTitle>
                  <p className="text-xs text-[#8A8A8A] -mt-1 mb-2.5">
                    Mua từ <span className="text-[#C9A84C] font-bold">{fmt(FREE_SHIP_THRESHOLD)}</span> được FREESHIP toàn quốc.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {upsellItems.slice(0, 6).map(p => (
                      <UpsellCard
                        key={p.sku}
                        product={p}
                        checked={extras.has(p.sku)}
                        onToggle={() => toggleExtra(p.sku)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* PART 4 — Order summary */}
              <section>
                <SectionTitle>Tóm tắt đơn hàng</SectionTitle>
                <div className="rounded-2xl border border-[#1E1E1E] bg-[#0A0A0A] p-3 flex flex-col gap-1">
                  {allItems.map(it => (
                    <div key={it.sku} className="flex items-baseline justify-between text-[13px]">
                      <span className="text-[#C8C8C8] truncate pr-2">
                        {it.qty}× {it.name}
                      </span>
                      <span className="text-[#F5F5F5] font-mono shrink-0">{fmt(it.unit * it.qty)}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#1E1E1E] my-1.5" />
                  <SummaryRow label={`Tạm tính (${totalQty} nón)`} value={fmt(subtotal)} />
                  <SummaryRow
                    label="Phí vận chuyển"
                    value={shipping === 0
                      ? <span className="text-[#C9A84C] font-bold">Miễn phí</span>
                      : fmt(shipping)}
                  />
                  <div className="border-t border-[#1E1E1E] my-1.5" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-black text-[#F5F5F5]">Tổng cộng</span>
                    <span className="text-[#C9A84C] font-mono font-black text-lg">{fmt(total)}</span>
                  </div>
                </div>
              </section>

              {/* Social proof — placed just above the sticky CTA so it's the
                  last thing the customer reads before tapping CONFIRM. */}
              <ul className="grid grid-cols-2 gap-2 text-[11.5px] text-[#C8C8C8] -mt-2">
                {SOCIAL_PROOF.map(p => (
                  <li key={p.text} className="flex items-start gap-1.5 leading-snug">
                    <span aria-hidden className="shrink-0">{p.icon}</span>
                    <span>{p.text}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* ── Sticky footer (idle/error states only) ────────────────────── */}
        {status !== 'success' && (
          <div className="border-t border-[#C9A84C]/15 px-5 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] shrink-0 bg-gradient-to-t from-[#0D0D0D] to-[#0A0A0A]">
            {statusErr && (
              <div className="mb-2 text-center">
                <p className="text-[13px] text-[#E05252] font-bold">❌ Không thể gửi đơn hàng</p>
                <p className="text-[11px] text-[#C8C8C8]">Vui lòng thử lại.</p>
              </div>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#C9A84C] hover:brightness-110 active:brightness-95 text-black font-black text-[15px] tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 flex items-center justify-center gap-2.5 shadow-[0_8px_24px_rgba(201,168,76,.35)]"
            >
              {status === 'submitting' ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,.2)" strokeWidth="3" />
                    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  ĐANG GỬI…
                </>
              ) : (
                <>🛒 XÁC NHẬN ĐẶT HÀNG · {fmt(total)}</>
              )}
            </button>
            <p className="text-[10px] text-[#5A5A5A] text-center mt-2">
              Thanh toán COD · TCAPS xác nhận qua Zalo trong vài phút
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[.18em] text-[#C9A84C] font-bold mb-2">
      {children}
    </p>
  )
}

function PrimaryProductCard({
  product, qty, onMinus, onPlus,
}: { product: Product; qty: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <section className="rounded-2xl border border-[#C9A84C]/25 bg-gradient-to-br from-[#C9A84C]/8 to-[#0A0A0A] p-3 flex items-center gap-3">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden shrink-0">
        {product.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={proxyImg(product.imageUrl, 256)} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[#4A4A4A]">🧢</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-[#C9A84C]/80 font-bold mb-0.5">Sản phẩm bạn vừa thử</p>
        <p className="text-[14px] sm:text-[15px] font-black text-[#F5F5F5] leading-tight line-clamp-2">{product.name}</p>
        <p className="text-[10.5px] text-[#6B6B6B] font-mono mt-0.5">Mã: {product.sku}</p>
        <p className="text-[#C9A84C] font-bold font-mono text-base mt-1">{fmt(product.priceBundle)}</p>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="text-[9px] uppercase tracking-wider text-[#8A8A8A]">Số lượng</span>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={onMinus} aria-label="Giảm" className="w-7 h-7 rounded-md border border-[#2A2A2A] text-[#C9A84C] hover:bg-[#C9A84C]/10 font-bold">−</button>
          <span className="w-7 text-center text-sm font-bold text-[#F5F5F5] tabular-nums">{qty}</span>
          <button type="button" onClick={onPlus} aria-label="Tăng" className="w-7 h-7 rounded-md border border-[#2A2A2A] text-[#C9A84C] hover:bg-[#C9A84C]/10 font-bold">+</button>
        </div>
      </div>
    </section>
  )
}

function UpsellCard({
  product, checked, onToggle,
}: { product: Product; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={[
        'flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all duration-150',
        checked
          ? 'border-[#C9A84C] bg-[#C9A84C]/10 shadow-[0_0_0_3px_rgba(201,168,76,.15)]'
          : 'border-[#1E1E1E] bg-[#0A0A0A] hover:border-[#C9A84C]/40',
      ].join(' ')}
    >
      <div className="w-12 h-12 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] overflow-hidden shrink-0">
        {product.imageUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={proxyImg(product.imageUrl, 96)} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[#4A4A4A] text-sm">🧢</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-[#F5F5F5] truncate">{product.name}</p>
        <p className="text-[11px] text-[#C9A84C] font-mono">{fmt(product.priceBundle)}</p>
      </div>
      <span
        aria-hidden
        className={[
          'w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-150',
          checked ? 'border-[#C9A84C] bg-[#C9A84C]' : 'border-[#3A3A3A] bg-transparent',
        ].join(' ')}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M3 7.5l2.5 2.5L11 4" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between text-[13px]">
      <span className="text-[#8A8A8A]">{label}</span>
      <span className="text-[#F5F5F5] font-mono">{value}</span>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, required, inputMode, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean
  inputMode?: 'text' | 'tel' | 'email'
  autoComplete?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-[#8A8A8A] font-semibold">
        {label}{required && <span className="text-[#C9A84C]"> *</span>}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="h-12 px-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] text-sm text-[#F5F5F5] placeholder:text-[#4A4A4A] outline-none focus:border-[#C9A84C]/70 focus:bg-[#0D0D0D] transition-all"
      />
    </label>
  )
}

function FieldTextarea({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-[#8A8A8A] font-semibold">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="px-3 py-2.5 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] text-sm text-[#F5F5F5] placeholder:text-[#4A4A4A] outline-none focus:border-[#C9A84C]/70 focus:bg-[#0D0D0D] transition-all resize-none"
      />
    </label>
  )
}

function SuccessPanel({ onClose, qty, total }: { onClose: () => void; qty: number; total: number }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-10 fade-in-up">
      <div className="text-6xl select-none" aria-hidden>🎉</div>
      <div>
        <h4 className="text-xl sm:text-2xl font-black text-[#F5F5F5] mb-1.5">Đặt hàng thành công</h4>
        <p className="text-[13px] text-[#C9A84C] font-bold font-mono">{qty} nón · {fmt(total)}</p>
      </div>
      <p className="text-sm text-[#C8C8C8] leading-relaxed max-w-sm">
        TCAPS sẽ liên hệ xác nhận đơn hàng trong thời gian sớm nhất.
      </p>
      <button
        onClick={onClose}
        className="mt-2 h-12 px-8 rounded-xl bg-[#C9A84C] hover:bg-[#E8C96A] text-black font-black text-xs uppercase tracking-widest transition-all"
      >
        Đóng
      </button>
    </div>
  )
}
