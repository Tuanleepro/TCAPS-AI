'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/constants/products'
import { OrderModal } from '@/components/tryon/OrderModal'
import { proxyImg } from '@/lib/img'
import { rankCompatibility } from '@/lib/recommendation-engine'
import { PRODUCTS } from '@/constants/products'

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

  const selectedVariant = useMemo(
    () => variants.find(v => variantKey(v) === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  )

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

  // Gallery: parent thumbnail + any per-variant images, deduped.
  const gallery = useMemo(() => {
    const urls: string[] = []
    if (product.imageUrl) urls.push(product.imageUrl)
    for (const v of variants) if (v.image) urls.push(v.image)
    return Array.from(new Set(urls))
  }, [product, variants])

  const [activeImage, setActiveImage] = useState(
    selectedVariant?.image ?? product.imageUrl,
  )
  // Keep the big image in sync with the variant choice.
  const displayedImage = selectedVariant?.image ?? activeImage ?? product.imageUrl

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
          <div className="relative aspect-square rounded-2xl overflow-hidden border border-[#1E1E1E] bg-[#0D0D0D]">
            {displayedImage ? (
              <Image
                src={proxyImg(displayedImage, 640)}
                alt={product.name}
                fill
                sizes="(max-width:768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-[#3A3A3A]" aria-hidden>🧢</div>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {gallery.slice(0, 5).map(url => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(url)}
                  aria-label="Xem ảnh"
                  className={[
                    'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                    displayedImage === url
                      ? 'border-[#C9A84C]'
                      : 'border-[#1E1E1E] hover:border-[#C9A84C]/40',
                  ].join(' ')}
                >
                  <Image
                    src={proxyImg(url, 128)}
                    alt=""
                    fill
                    sizes="80px"
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

          <p className="text-[11px] text-[#6B6B6B] font-mono">Mã sản phẩm: {product.sku}</p>

          <div className="flex items-baseline gap-3">
            <p className="text-3xl text-[#C9A84C] font-mono font-black tabular-nums">
              {fmt(currentPrice)}
            </p>
            {product.price > currentPrice && (
              <p className="text-sm text-[#6B6B6B] line-through font-mono">
                {fmt(product.price)}
              </p>
            )}
          </div>

          <p className="text-xs text-[#C9A84C]/80 -mt-1">
            🎁 Mua 2 nón + Free Ship chỉ <strong>250K/2 nón</strong>
          </p>

          {/* Variant picker */}
          {variants.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] uppercase tracking-widest text-[#8A8A8A] font-semibold mb-2">
                Chọn mẫu <span className="text-[#C9A84C]">*</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {variants.map(v => {
                  const id = variantKey(v)
                  const active = id === selectedVariantId
                  const outOfStock = typeof v.stock === 'number' && v.stock <= 0
                  return (
                    <button
                      key={id || v.name || Math.random()}
                      type="button"
                      onClick={() => setSelectedVariantId(id)}
                      aria-pressed={active}
                      className={[
                        'h-12 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all px-2 text-center',
                        active
                          ? 'border-[#C9A84C] bg-[#C9A84C]/12 text-[#C9A84C]'
                          : outOfStock
                          ? 'border-[#1E1E1E] text-[#5A5A5A] cursor-not-allowed line-through'
                          : 'border-[#2A2A2A] hover:border-[#C9A84C]/50 text-[#C8C8C8]',
                      ].join(' ')}
                      disabled={outOfStock}
                      title={outOfStock ? 'Hết hàng' : undefined}
                    >
                      {v.name || v.sku}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              type="button"
              onClick={() => setOrderOpen(true)}
              className="h-13 py-3.5 rounded-xl bg-gradient-to-r from-[#C9A84C] via-[#E8C96A] to-[#C9A84C] hover:brightness-110 active:brightness-95 text-black font-black text-sm tracking-wider transition-all shadow-[0_8px_24px_rgba(201,168,76,.35)] flex items-center justify-center gap-1.5"
            >
              🛒 MUA NGAY
            </button>
            <Link
              href={`/try-on?sku=${encodeURIComponent(product.sku)}`}
              className="h-13 py-3.5 rounded-xl border-2 border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10 active:bg-[#C9A84C]/15 font-black text-sm tracking-wider flex items-center justify-center gap-1.5 transition-all"
            >
              ✨ THỬ NÓN AI
            </Link>
          </div>

          {/* Trust strip */}
          <ul className="mt-5 space-y-1.5 text-[12.5px] text-[#8A8A8A] border-t border-[#1E1E1E] pt-4">
            <li className="flex items-start gap-2">
              <span aria-hidden>🚚</span>
              <span>Ship COD toàn quốc · Phí 30K · <strong className="text-[#F5F5F5]">Free ship đơn từ 250K</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden>🔄</span>
              <span>Đổi trả 30 ngày nếu lỗi sản xuất</span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden>💬</span>
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
                    : <div className="w-full h-full flex items-center justify-center text-4xl text-[#3A3A3A]" aria-hidden>🧢</div>}
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
