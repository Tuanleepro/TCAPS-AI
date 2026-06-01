'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCart } from '@/lib/cart/CartContext'
import { fmtVnd } from '@/lib/pricing'
import { proxyImg } from '@/lib/img'

// Social proof — same bullets the single-product OrderModal carries.
const SOCIAL_PROOF: Array<{ icon: string; text: string }> = [
  { icon: '⭐', text: 'Hơn 150.000+ nón đã được bán'   },
  { icon: '⭐', text: 'Đánh giá trung bình 4.8/5'      },
  { icon: '🛡️', text: 'Bảo hành 30 ngày từ ngày nhận' },
  { icon: '🔄', text: 'Đổi trả nếu lỗi sản xuất'      },
]

export function CheckoutModal() {
  const {
    items, totalQty, pricing,
    clear,
    checkoutOpen, closeCheckout,
  } = useCart()

  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [address,  setAddress]  = useState('')
  const [province, setProvince] = useState('')
  const [note,     setNote]     = useState('')

  const [status,    setStatus]    = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [statusErr, setStatusErr] = useState<string | null>(null)

  const bodyRef = useRef<HTMLDivElement>(null)

  // Reset form on every open.
  useEffect(() => {
    if (checkoutOpen) {
      setStatus('idle')
      setStatusErr(null)
    }
  }, [checkoutOpen])

  // iOS-safe body scroll lock + Esc-to-close.
  useEffect(() => {
    if (!checkoutOpen) return
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCheckout() }
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
  }, [checkoutOpen, closeCheckout])

  const canSubmit =
    status !== 'submitting' &&
    items.length > 0 &&
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
        items: items.map(it => ({
          sku:  it.variantSku || it.sku,   // POS uses variant SKU when available
          name: it.name,
          unit: it.unitPrice,
          qty:  it.qty,
        })),
        customer: {
          name:     name.trim(),
          phone:    phone.trim(),
          address:  address.trim(),
          province: province.trim(),
          note:     note.trim(),
        },
        totals: {
          subtotal: pricing.subtotal,
          shipping: pricing.shipping,
          total:    pricing.total,
          qty:      totalQty,
          bonusQty: pricing.bonusQty,
        },
      }
      const r = await fetch('/api/order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const d = await r.json().catch(() => null) as { ok?: boolean; error?: string } | null
      if (!r.ok || !d?.ok) throw new Error(d?.error || `HTTP ${r.status}`)
      setStatus('success')
      // Empty the cart on success — the order is already in Sheets.
      clear()
    } catch (e) {
      setStatus('error')
      setStatusErr(e instanceof Error ? e.message : 'Không thể gửi đơn hàng. Vui lòng thử lại.')
    }
  }, [canSubmit, items, name, phone, address, province, note, pricing, totalQty, clear])

  if (!checkoutOpen) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md"
      onClick={closeCheckout}
      onWheel={(e) => {
        if (!bodyRef.current) return
        const target = e.target as HTMLElement
        if (bodyRef.current.contains(target)) return
        bodyRef.current.scrollTop += e.deltaY
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận đơn hàng TCAPS"
    >
      <div
        className="w-full h-[92vh] sm:h-[820px] sm:max-h-[90vh] sm:max-w-2xl sm:mx-auto bg-gradient-to-b from-[#0D0D0D] to-[#0A0A0A] border-t-2 sm:border-2 border-[#C9A84C]/40 sm:rounded-3xl shadow-[0_-12px_80px_rgba(201,168,76,.15)] flex flex-col overflow-hidden modal-fade-in"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 'min(640px, 100vw)' }}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#C9A84C]/15 shrink-0 bg-gradient-to-r from-[#C9A84C]/6 to-transparent">
          <div>
            <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] font-bold">Đặt nón TCAPS</p>
            <h3 className="text-lg sm:text-xl font-black text-[#F5F5F5] tracking-tight">Xác nhận đơn hàng</h3>
          </div>
          <button
            onClick={closeCheckout}
            aria-label="Đóng"
            className="w-10 h-10 rounded-xl border border-[#2A2A2A] hover:border-[#C9A84C]/60 bg-[#0A0A0A] flex items-center justify-center text-[#8A8A8A] hover:text-[#C9A84C] transition-all duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2.5 2.5l11 11M13.5 2.5l-11 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="modal-scrollbar overflow-y-auto flex-1 min-h-0 px-5 py-5 flex flex-col gap-6">

          {status === 'success' ? (
            <SuccessPanel onClose={closeCheckout} qty={totalQty} total={pricing.total} />
          ) : (
            <>
              {/* Cart items */}
              <section>
                <SectionTitle>Sản phẩm ({totalQty} nón)</SectionTitle>
                <div className="rounded-2xl border border-[#C9A84C]/25 bg-gradient-to-br from-[#C9A84C]/6 to-[#0A0A0A] p-2 flex flex-col gap-1.5">
                  {items.map(it => (
                    <div key={it.key} className="flex items-center gap-3 p-1.5">
                      <div className="w-14 h-14 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] overflow-hidden shrink-0">
                        {it.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={proxyImg(it.image, 128)} alt={it.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-[#4A4A4A]">🧢</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[#F5F5F5] leading-tight line-clamp-2">{it.name}</p>
                        <p className="text-[10.5px] text-[#6B6B6B] font-mono mt-0.5">Mã: {it.variantSku || it.sku}</p>
                      </div>
                      <span className="text-[12px] font-bold text-[#C9A84C] font-mono tabular-nums shrink-0">×{it.qty}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Customer info form */}
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

              {/* Summary */}
              <section>
                <SectionTitle>Tóm tắt đơn hàng</SectionTitle>
                <div className="rounded-2xl border border-[#1E1E1E] bg-[#0A0A0A] p-3 flex flex-col gap-1">
                  {pricing.bonusQty > 0 && (
                    <div className="mb-1.5 flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[#C9A84C]/35 bg-[#C9A84C]/8 text-[12px] text-[#C9A84C] font-bold">
                      <span aria-hidden>🎁</span>
                      <span>Tặng thêm <strong>{pricing.bonusQty} nón</strong> — TCAPS xác nhận mẫu tặng kèm.</span>
                    </div>
                  )}
                  <SummaryRow label={`Tạm tính (${totalQty} nón)`} value={fmtVnd(pricing.subtotal)} />
                  <SummaryRow
                    label="Phí vận chuyển"
                    value={pricing.shipping === 0
                      ? <span className="text-[#C9A84C] font-bold">Miễn phí</span>
                      : fmtVnd(pricing.shipping)}
                  />
                  <div className="border-t border-[#1E1E1E] my-1.5" />
                  <div className="flex items-baseline justify-between">
                    <span className="font-black text-[#F5F5F5]">Tổng cộng</span>
                    <span className="text-[#C9A84C] font-mono font-black text-lg">{fmtVnd(pricing.total)}</span>
                  </div>
                </div>
              </section>

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

        {/* Footer CTA */}
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
                <>🛒 XÁC NHẬN ĐẶT HÀNG · {fmtVnd(pricing.total)}</>
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
        <p className="text-[13px] text-[#C9A84C] font-bold font-mono">{qty} nón · {fmtVnd(total)}</p>
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
