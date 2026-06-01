'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useCart } from '@/lib/cart/CartContext'
import { proxyImg } from '@/lib/img'
import { fmtVnd } from '@/lib/pricing'
import { CartIcon } from '@/components/ui/icons'

export function CartDrawer() {
  const {
    items, totalQty, pricing,
    setQty, removeItem,
    drawerOpen, closeDrawer, openCheckout,
  } = useCart()

  // iOS-safe body scroll lock + Esc-to-close.
  useEffect(() => {
    if (!drawerOpen) return
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDrawer() }
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
  }, [drawerOpen, closeDrawer])

  if (!drawerOpen) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex justify-end bg-black/70 backdrop-blur-md cart-fade-in"
      onClick={closeDrawer}
      role="dialog"
      aria-modal="true"
      aria-label="Giỏ hàng"
    >
      <div
        className="w-full sm:max-w-[440px] h-full bg-gradient-to-b from-[#0D0D0D] to-[#0A0A0A] border-l-2 border-[#C9A84C]/40 shadow-[-12px_0_60px_rgba(0,0,0,.7)] flex flex-col cart-slide-in"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#C9A84C]/15 shrink-0 bg-gradient-to-r from-[#C9A84C]/6 to-transparent">
          <div>
            <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] font-bold">Giỏ hàng TCAPS</p>
            <h3 className="text-lg font-black text-[#F5F5F5] tracking-tight">
              {totalQty > 0 ? `${totalQty} nón đã chọn` : 'Giỏ hàng trống'}
            </h3>
          </div>
          <button
            onClick={closeDrawer}
            aria-label="Đóng giỏ hàng"
            className="w-10 h-10 rounded-xl border border-[#2A2A2A] hover:border-[#C9A84C]/60 bg-[#0A0A0A] flex items-center justify-center text-[#8A8A8A] hover:text-[#C9A84C] transition-all duration-150"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2.5 2.5l11 11M13.5 2.5l-11 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto modal-scrollbar">
          {items.length === 0 ? (
            <EmptyState onClose={closeDrawer} />
          ) : (
            <div className="px-4 py-4 flex flex-col gap-3">
              {items.map(it => (
                <Row
                  key={it.key}
                  image={it.image}
                  name={it.name}
                  unitPrice={it.unitPrice}
                  qty={it.qty}
                  onMinus={() => setQty(it.key, it.qty - 1)}
                  onPlus={() => setQty(it.key, it.qty + 1)}
                  onRemove={() => removeItem(it.key)}
                />
              ))}
              <p className="mt-1 px-1 text-[11px] text-[#8A8A8A] leading-relaxed">
                💰 <span className="text-[#C9A84C] font-bold">2 nón 250K · 3 nón 370K · 4 nón 516K tặng 1 · 5 nón 650K tặng 1</span> · Freeship từ 2 nón.
              </p>
            </div>
          )}
        </div>

        {/* Footer summary + CTA — only when cart non-empty */}
        {items.length > 0 && (
          <div className="border-t border-[#C9A84C]/15 px-5 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] shrink-0 bg-gradient-to-t from-[#0D0D0D] to-[#0A0A0A]">
            <div className="flex flex-col gap-1.5 mb-3">
              <Row2 label={`Tạm tính (${totalQty} nón)`} value={fmtVnd(pricing.subtotal)} />
              <Row2
                label="Phí vận chuyển"
                value={pricing.shipping === 0
                  ? <span className="text-[#C9A84C] font-bold">Miễn phí</span>
                  : fmtVnd(pricing.shipping)}
              />
              {pricing.bonusQty > 0 && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[#C9A84C]/35 bg-[#C9A84C]/8 text-[12px] text-[#C9A84C] font-bold">
                  <span aria-hidden>🎁</span>
                  <span>Tặng thêm <strong>{pricing.bonusQty} nón</strong> — TCAPS xác nhận mẫu tặng kèm.</span>
                </div>
              )}
              <div className="border-t border-[#1E1E1E] my-1" />
              <div className="flex items-baseline justify-between">
                <span className="font-black text-[#F5F5F5]">Tổng cộng</span>
                <span className="text-[#C9A84C] font-mono font-black text-lg">{fmtVnd(pricing.total)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={openCheckout}
              className="w-full h-13 py-3.5 rounded-2xl bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#C9A84C] hover:brightness-110 active:brightness-95 text-black font-black text-[14px] tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(201,168,76,.35)]"
            >
              🛒 ĐẶT HÀNG · {fmtVnd(pricing.total)}
            </button>
            <p className="text-[10px] text-[#5A5A5A] text-center mt-2">
              Thanh toán COD · TCAPS xác nhận qua Zalo
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Row({
  image, name, unitPrice, qty, onMinus, onPlus, onRemove,
}: {
  image: string; name: string; unitPrice: number; qty: number
  onMinus: () => void; onPlus: () => void; onRemove: () => void
}) {
  return (
    <div className="rounded-xl border border-[#1E1E1E] bg-[#0A0A0A] p-2.5 flex gap-3">
      <div className="w-16 h-16 rounded-lg border border-[#1E1E1E] bg-[#0A0A0A] overflow-hidden shrink-0">
        {image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={proxyImg(image, 128)} alt={name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-[#4A4A4A]">🧢</div>}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <p className="text-[13px] font-bold text-[#F5F5F5] leading-tight line-clamp-2">{name}</p>
        <p className="text-[11px] text-[#C9A84C] font-mono mt-0.5">{fmtVnd(unitPrice)}</p>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={onMinus} aria-label="Giảm" className="w-7 h-7 rounded-md border border-[#2A2A2A] text-[#C9A84C] hover:bg-[#C9A84C]/10 font-bold">−</button>
            <span className="w-7 text-center text-sm font-bold text-[#F5F5F5] tabular-nums">{qty}</span>
            <button type="button" onClick={onPlus} aria-label="Tăng" className="w-7 h-7 rounded-md border border-[#2A2A2A] text-[#C9A84C] hover:bg-[#C9A84C]/10 font-bold">+</button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Xoá"
            className="text-[10.5px] uppercase tracking-wider font-bold text-[#6B6B6B] hover:text-[#E05252] transition-colors"
          >
            Xoá
          </button>
        </div>
      </div>
    </div>
  )
}

function Row2({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between text-[13px]">
      <span className="text-[#8A8A8A]">{label}</span>
      <span className="text-[#F5F5F5] font-mono">{value}</span>
    </div>
  )
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-6 py-16 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-2xl border border-[#1E1E1E] bg-[#0A0A0A] flex items-center justify-center text-[#3A3A3A]">
        <CartIcon size={28} />
      </div>
      <div>
        <p className="text-sm font-bold text-[#F5F5F5] mb-1">Chưa có nón nào trong giỏ</p>
        <p className="text-xs text-[#6B6B6B] leading-relaxed">Khám phá bộ sưu tập TCAPS để bắt đầu mua sắm.</p>
      </div>
      <Link
        href="/catalog"
        onClick={onClose}
        className="h-11 px-5 rounded-xl bg-[#C9A84C] hover:bg-[#E8C96A] text-black text-xs font-black uppercase tracking-widest flex items-center justify-center transition-colors"
      >
        Xem bộ sưu tập
      </Link>
    </div>
  )
}
