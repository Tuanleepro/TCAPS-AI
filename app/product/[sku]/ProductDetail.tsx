'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/constants/products'
import { OrderModal } from '@/components/tryon/OrderModal'
import { BanIcon, CapIcon, CartIcon, ChatIcon, GiftIcon, RefreshIcon, SparkleIcon, TruckIcon } from '@/components/ui/icons'
import { proxyImg } from '@/lib/img'
import { rankCompatibility } from '@/lib/recommendation-engine'
import { PRODUCTS } from '@/constants/products'
import { cartKey, useCart } from '@/lib/cart/CartContext'

const fmt = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`

// Same recommendation engine the result panel uses — show a handful of caps
// similar to this one underneath, so the customer has somewhere to go if
// this isn't quite right.
const RELATED_LIMIT = 4

export function ProductDetail({ product }: { product: Product }) {
  const variants = product.variants ?? []
  // Use sku as the variant identifier when present, otherwise fall back to
  // name. ProductVariant in the catalog has sku/name as optional.
  const variantKey = (v: typeof variants[number]) => v.sku ?? v.name ?? ''
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0] ? variantKey(variants[0]) : '',
  )
  const [orderOpen, setOrderOpen] = useState(false)
  const { addItem, openDrawer } = useCart()

  const selectedVariant = useMemo(
    () => variants.find(v => variantKey(v) === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  )

  // Out-of-stock for the CURRENTLY selected variant — used to disable MUA NGAY
  // but not the variant picker (customer can still tap an out-of-stock variant
  // to view its photo and try it on with AI, just can't buy it).
  const selectedOutOfStock = useMemo(() => {
    if (selectedVariant) {
      return typeof selectedVariant.stock === 'number' && selectedVariant.stock <= 0
    }
    return typeof product.stock === 'number' && product.stock <= 0
  }, [selectedVariant, product.stock])

  // Build the effective Product that gets passed to <OrderModal> when the
  // customer taps MUA NGAY. We merge the selected variant on top of the
  // parent so the modal sees the right name / image / price without needing
  // to know about variants. SKU stays the parent so the order row in the
  // sheet is consistent across variants of the same model.
  const effectiveProduct: Product = useMemo(() => {
    if (!selectedVariant) return product
    return {
      ...product,
      name: selectedVariant.name
        ? `${product.name} (${selectedVariant.name})`
        : product.name,
      priceBundle: selectedVariant.price ?? product.priceBundle,
      imageUrl:    selectedVariant.image ?? product.imageUrl,
    }
  }, [product, selectedVariant])

  // Gallery: variant's canonical image first, then the FULL Pancake
  // gallery (product.images[] — these are the multi-angle photos the
  // owner uploads in Pancake POS), then product.imageUrl + the other
  // variant photos as fallback. Deduped, falsy stripped.
  const gallery = useMemo(() => {
    const urls: string[] = []
    if (selectedVariant?.image) urls.push(selectedVariant.image)
    for (const u of product.images ?? []) urls.push(u)
    if (product.imageUrl) urls.push(product.imageUrl)
    for (const v of variants) if (v.image) urls.push(v.image)
    return Array.from(new Set(urls.filter(Boolean)))
  }, [product, variants, selectedVariant])

  // Index into gallery — `0` is always the canonical (variant) image.
  const [activeIndex, setActiveIndex] = useState(0)
  // Snap back to the canonical image whenever the customer picks a
  // different variant.
  useEffect(() => { setActiveIndex(0) }, [selectedVariantId])
  // Clamp if gallery shrinks (e.g. product data refetched).
  useEffect(() => {
    if (activeIndex >= gallery.length) setActiveIndex(0)
  }, [gallery.length, activeIndex])

  const displayedImage = gallery[activeIndex] ?? product.imageUrl

  const goNext = () => setActiveIndex(i => (i + 1) % Math.max(1, gallery.length))
  const goPrev = () => setActiveIndex(i => (i - 1 + Math.max(1, gallery.length)) % Math.max(1, gallery.length))

  // Touch-swipe + keyboard navigation on the main image.
  const touchStartX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current
    if (startX == null) return
    const dx = e.changedTouches[0].clientX - startX
    if (Math.abs(dx) > 40) (dx < 0 ? goNext : goPrev)()
    touchStartX.current = null
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gallery.length])

  // Keep selected thumbnail visible inside the horizontal scroll strip.
  const thumbStripRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const strip = thumbStripRef.current
    if (!strip) return
    const el = strip.querySelector<HTMLButtonElement>(`[data-idx="${activeIndex}"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIndex])

  // Related products — pick by face shape if the catalog has labels; otherwise
  // just take the next 4 with imageUrls excluding the current one.
  const related = useMemo(() => {
    if (product.faceShapes?.[0]) {
      return rankCompatibility(PRODUCTS, product.faceShapes[0], {
        excludeSku: product.sku,
        limit:      RELATED_LIMIT,
      }).map(r => r.product)
    }
    return PRODUCTS.filter(p => p.sku !== product.sku && p.imageUrl).slice(0, RELATED_LIMIT)
  }, [product])

  const currentPrice = selectedVariant?.price ?? product.priceBundle

  return (
    <main className="pt-20 sm:pt-24 pb-20 max-w-5xl mx-auto px-4">

      {/* Breadcrumb */}
      <nav className="text-xs text-[#6B6B6B] mb-5 flex items-center gap-1.5">
        <Link href="/catalog" className="hover:text-[#C9A84C] transition-colors inline-flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M7 2L3 5.5l4 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Bộ sưu tập
        </Link>
        <span className="text-[#3A3A3A]">/</span>
        <span className="truncate text-[#8A8A8A]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">

        {/* ── Left: Image gallery ─────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div
            className="group relative aspect-square rounded-2xl overflow-hidden border border-[#1E1E1E] bg-[#0D0D0D] select-none touch-pan-y"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {displayedImage ? (
              <Image
                key={displayedImage}
                src={proxyImg(displayedImage, 640)}
                alt={product.name}
                fill
                sizes="(max-width:768px) 100vw, 50vw"
                className="object-cover animate-[fadeIn_.25s_ease-out]"
                priority
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#3A3A3A]" aria-hidden><CapIcon size={64} /></div>
            )}

            {gallery.length > 1 && (
              <>
                {/* Prev / Next arrows — always visible on touch (mobile),
                    fade in on hover for desktop. Tap targets are 40px so
                    they meet accessibility minimums. */}
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Ảnh trước"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-sm text-white flex items-center justify-center transition-opacity opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Ảnh sau"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-sm text-white flex items-center justify-center transition-opacity opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>

                {/* Counter + dots */}
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm">
                  <span className="text-[10px] font-mono text-white/90 tabular-nums">{activeIndex + 1}/{gallery.length}</span>
                </div>
              </>
            )}
          </div>

          {gallery.length > 1 && (
            <div
              ref={thumbStripRef}
              className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#1E1E1E]"
              style={{ scrollbarWidth: 'thin' }}
            >
              {gallery.map((url, i) => (
                <button
                  key={url}
                  data-idx={i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  aria-label={`Xem ảnh ${i + 1}`}
                  aria-current={i === activeIndex}
                  className={[
                    'relative shrink-0 snap-start w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-lg overflow-hidden border-2 transition-all',
                    i === activeIndex
                      ? 'border-[#C9A84C]'
                      : 'border-[#1E1E1E] hover:border-[#C9A84C]/40 opacity-75 hover:opacity-100',
                  ].join(' ')}
                >
                  <Image
                    src={proxyImg(url, 128)}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Details + actions ────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-[.22em] text-[#C9A84C] font-bold">
            {product.style || 'Streetwear'}
          </p>

          <h1 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] leading-tight">
            {product.name}
          </h1>

          {/* Variant picker — placed right under the name so it's the
              customer's first decision before they see the price (which
              changes per-variant when stock has a different price). */}
          {variants.length > 0 && (
            <div className="mt-1">
              <p className="text-[11px] uppercase tracking-widest text-[#8A8A8A] font-semibold mb-1.5">
                Chọn mẫu <span className="text-[#C9A84C]">*</span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {variants.map(v => {
                  const id = variantKey(v)
                  const active = id === selectedVariantId
                  const outOfStock = typeof v.stock === 'number' && v.stock <= 0
                  // Always clickable — customer can pick an out-of-stock variant
                  // to view its photo and run AI Try-On on it. Only the MUA
                  // NGAY button below the picker gets disabled when the
                  // current selection is out of stock.
                  return (
                    <button
                      key={id || v.name || Math.random()}
                      type="button"
                      onClick={() => setSelectedVariantId(id)}
                      aria-pressed={active}
                      className={[
                        'h-9 rounded-lg border text-[11px] font-bold transition-all px-1.5 text-center cursor-pointer whitespace-nowrap overflow-hidden',
                        active && outOfStock
                          ? 'border-[#C9A84C] bg-[#C9A84C]/12 text-[#C9A84C] line-through'
                          : active
                          ? 'border-[#C9A84C] bg-[#C9A84C]/12 text-[#C9A84C]'
                          : outOfStock
                          ? 'border-[#1E1E1E] text-[#5A5A5A] line-through hover:border-[#C9A84C]/30 hover:text-[#7A7A7A]'
                          : 'border-[#2A2A2A] hover:border-[#C9A84C]/50 text-[#C8C8C8]',
                      ].join(' ')}
                      title={outOfStock ? 'Hết hàng — vẫn xem ảnh + thử AI được' : undefined}
                    >
                      {v.name || v.sku}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-3xl text-[#C9A84C] font-mono font-black tabular-nums">
              {fmt(currentPrice)}
            </p>
            {product.price > currentPrice && (
              <p className="text-sm text-[#6B6B6B] line-through font-mono">
                {fmt(product.price)}
              </p>
            )}
            {selectedOutOfStock && (
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E05252] bg-[#E05252]/10 border border-[#E05252]/35 px-2 py-1 rounded-full">
                Tạm hết hàng
              </span>
            )}
          </div>

          <p className="text-xs text-[#C9A84C]/80 -mt-1 flex items-start gap-1.5 leading-relaxed">
            <GiftIcon size={14} className="mt-0.5 shrink-0" />
            <span>Combo: 2 nón <strong>250K</strong> · 3 nón <strong>370K</strong> · 4 nón <strong>516K</strong> tặng 1 · 5 nón <strong>650K</strong> tặng 1 · Freeship từ 2 nón.</span>
          </p>

          {/* Reference SKU — small mono caption below the commercial info,
              before the CTAs. Reads as a reference, not a primary fact. */}
          <p className="text-[10.5px] text-[#6B6B6B] font-mono">Mã sản phẩm: {product.sku}</p>

          {/* CTAs — Three actions:
              1. THÊM VÀO GIỎ : add the picked variant to the cart, drawer
                 slides open so the customer sees the running total + can
                 keep browsing for combo savings.
              2. MUA NGAY     : the original instant-buy modal (single product
                 + upsell). Disabled when the variant is out of stock.
              3. THỬ NÓN AI   : virtual try-on — always enabled, customers
                 can preview any variant regardless of stock. */}
          <button
            type="button"
            onClick={() => {
              const vSku = selectedVariant?.sku
              const variantName = selectedVariant?.name
              addItem({
                key:        cartKey(product.sku, vSku),
                sku:        product.sku,
                variantSku: vSku,
                name:       variantName ? `${product.name} (${variantName})` : product.name,
                image:      selectedVariant?.image || product.imageUrl,
                unitPrice:  currentPrice,
              })
              openDrawer()
            }}
            className="mt-3 h-12 py-3 rounded-xl border-2 border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10 active:bg-[#C9A84C]/15 font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <CartIcon size={16} />
            <span>THÊM VÀO GIỎ</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderOpen(true)}
              disabled={selectedOutOfStock}
              aria-disabled={selectedOutOfStock}
              title={selectedOutOfStock ? 'Mẫu này tạm hết hàng — bạn vẫn có thể thử AI hoặc chọn mẫu khác' : undefined}
              className={[
                'h-13 py-3.5 rounded-xl font-black text-sm tracking-wider transition-all flex items-center justify-center gap-1.5',
                selectedOutOfStock
                  ? 'bg-[#1E1E1E] text-[#5A5A5A] cursor-not-allowed border-2 border-[#2A2A2A]'
                  : 'bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#C9A84C] hover:brightness-110 active:brightness-95 text-black shadow-[0_8px_24px_rgba(201,168,76,.35)]',
              ].join(' ')}
            >
              {selectedOutOfStock ? <BanIcon size={16} /> : <CartIcon size={16} />}
              <span>{selectedOutOfStock ? 'TẠM HẾT HÀNG' : 'MUA NGAY'}</span>
            </button>
            <Link
              href={
                `/try-on?sku=${encodeURIComponent(product.sku)}` +
                (selectedVariantId ? `&v=${encodeURIComponent(selectedVariantId)}` : '')
              }
              className="h-13 py-3.5 rounded-xl border-2 border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10 active:bg-[#C9A84C]/15 font-black text-sm tracking-wider flex items-center justify-center gap-1.5 transition-all"
            >
              <SparkleIcon size={16} />
              <span>THỬ NÓN AI</span>
            </Link>
          </div>

          {/* Trust strip */}
          <ul className="mt-5 space-y-2 text-[12.5px] text-[#8A8A8A] border-t border-[#1E1E1E] pt-4">
            <li className="flex items-start gap-2.5">
              <TruckIcon className="mt-0.5 shrink-0 text-[#C9A84C]" size={16} />
              <span>Ship COD toàn quốc · 1 nón ship 30K · <strong className="text-[#F5F5F5]">Freeship khi mua từ 2 nón</strong></span>
            </li>
            <li className="flex items-start gap-2.5">
              <RefreshIcon className="mt-0.5 shrink-0 text-[#C9A84C]" size={16} />
              <span>Đổi trả 30 ngày nếu lỗi sản xuất</span>
            </li>
            <li className="flex items-start gap-2.5">
              <ChatIcon className="mt-0.5 shrink-0 text-[#C9A84C]" size={16} />
              <span>Hỗ trợ qua <strong className="text-[#F5F5F5]">Zalo · Messenger · Hotline 0972 284 146</strong></span>
            </li>
          </ul>

          {product.description && (
            <div className="mt-4 pt-4 border-t border-[#1E1E1E]">
              <p className="text-[11px] uppercase tracking-widest text-[#8A8A8A] font-semibold mb-2">Mô tả</p>
              <p className="text-sm text-[#C8C8C8] leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-16">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-black text-[#F5F5F5]">Có thể bạn cũng thích</h2>
            <Link href="/catalog" className="text-xs text-[#C9A84C] hover:text-[#E8C96A] font-semibold inline-flex items-center gap-1">
              Xem tất cả
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {related.map(rp => (
              <Link
                key={rp.sku}
                href={`/product/${encodeURIComponent(rp.sku)}`}
                className="group flex flex-col rounded-xl border border-[#1E1E1E] bg-[#111] overflow-hidden hover:border-[#C9A84C]/50 transition-all"
              >
                <div className="relative h-40 sm:h-44 bg-[#0A0A0A]">
                  {rp.imageUrl
                    ? (
                      <Image
                        src={proxyImg(rp.imageUrl, 256)}
                        alt={rp.name}
                        fill
                        sizes="(max-width:768px) 50vw, 25vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )
                    : <div className="w-full h-full flex items-center justify-center text-[#3A3A3A]" aria-hidden><CapIcon size={36} /></div>}
                </div>
                <div className="p-2.5 flex flex-col gap-0.5">
                  <p className="text-[12.5px] font-bold text-[#F5F5F5] line-clamp-2">{rp.name}</p>
                  <p className="text-[11px] text-[#C9A84C] font-mono">{fmt(rp.priceBundle)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <OrderModal
        open={orderOpen}
        product={{ ...effectiveProduct, priceBundle: effectiveProduct.priceBundle }}
        onClose={() => setOrderOpen(false)}
      />
    </main>
  )
}
