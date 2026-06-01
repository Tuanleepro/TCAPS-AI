'use client'

import { useEffect, useRef } from 'react'
import { useCart } from '@/lib/cart/CartContext'
import { CartIcon } from '@/components/ui/icons'

export function CartButton({ className = '' }: { className?: string }) {
  const { totalQty, bump, openDrawer } = useCart()
  const ref = useRef<HTMLButtonElement>(null)

  // Bounce-animate the badge whenever the cart `bump` counter ticks (i.e. an
  // item was just added). Visually re-affirms the add so the customer doesn't
  // think the click missed.
  useEffect(() => {
    if (!ref.current || bump === 0) return
    ref.current.classList.remove('cart-badge-bump')
    // Force reflow so the animation restarts even on consecutive adds.
    void ref.current.offsetWidth
    ref.current.classList.add('cart-badge-bump')
  }, [bump])

  return (
    <button
      ref={ref}
      type="button"
      onClick={openDrawer}
      aria-label={`Giỏ hàng (${totalQty} nón)`}
      className={[
        'relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl border border-[#2A2A2A] hover:border-[#C9A84C]/60 bg-[#0A0A0A] flex items-center justify-center text-[#C8C8C8] hover:text-[#C9A84C] transition-all',
        className,
      ].join(' ')}
    >
      <CartIcon size={18} />
      {totalQty > 0 && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C9A84C] text-black text-[10px] font-black tabular-nums flex items-center justify-center shadow-[0_0_0_2px_#0A0A0A]"
        >
          {totalQty > 99 ? '99+' : totalQty}
        </span>
      )}
    </button>
  )
}
