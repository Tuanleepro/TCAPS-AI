import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/layout/Navbar'
import { PRODUCTS } from '@/constants/products'
import { proxyImg } from '@/lib/img'

const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`

// Real product photos first, then curated placeholders.
const ITEMS = [...PRODUCTS].sort((a, b) => (b.imageUrl ? 1 : 0) - (a.imageUrl ? 1 : 0))

export default function CatalogPage() {
  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F5F5F5]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[.18em] text-[#C9A84C] mb-2">Catalog</p>
          <h1 className="text-3xl font-black mb-1">Bộ Sưu Tập TCAPS</h1>
          <p className="text-sm text-[#6B6B6B]">{PRODUCTS.length} sản phẩm — Mua 2 nón + Free Ship chỉ 250K/2 nón</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {ITEMS.map(h => (
            // Card is no longer a single <Link> — needs two distinct CTAs at
            // the bottom. The image + title block stays clickable (goes to
            // the detail page) via its own <Link>, the action row has
            // separate MUA / THỬ NÓN buttons.
            <div
              key={h.sku}
              className="group flex flex-col rounded-2xl border border-[#161616] bg-[#111] overflow-hidden transition-all duration-300 hover:border-[#C9A84C]/60 hover:-translate-y-1 hover:shadow-[0_12px_34px_-12px_rgba(201,168,76,0.35)]"
            >
              <Link
                href={`/product/${encodeURIComponent(h.sku)}`}
                aria-label={`Chi tiết ${h.name}`}
                className="flex flex-col flex-1"
              >
                {/* fixed height (iOS WebKit collapses aspect-ratio on flex items) */}
                <div className="h-44 sm:h-48 lg:h-52 relative overflow-hidden bg-[#0A0A0A] flex items-center justify-center">
                  {h.imageUrl ? (
                    <Image
                      src={proxyImg(h.imageUrl)}
                      alt={h.name}
                      fill
                      unoptimized
                      loading="lazy"
                      sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <svg viewBox="0 0 110 76" className="w-[65%] opacity-80 transition-transform duration-300 group-hover:scale-110">
                      <path d="M12 52 Q55 14 98 52 L102 58 Q55 44 8 58 Z" fill="#2A2A2A" stroke="#4A4A4A" strokeWidth="1" />
                      <rect x="6" y="57" width="98" height="8" rx="4" fill="#2A2A2A" stroke="#4A4A4A" strokeWidth="1" />
                    </svg>
                  )}
                  {h.badge && (
                    <span className="absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-[#C9A84C] text-black tracking-wide z-10">
                      {h.badge}
                    </span>
                  )}
                </div>
                <div className="p-3 border-t border-[#161616] flex flex-col flex-1">
                  <p className="text-sm font-bold leading-snug line-clamp-2 min-h-[2.4em]" title={h.name}>{h.name}</p>
                  <p className="text-xs text-[#5A5A5A] capitalize mt-1 truncate">
                    {[h.line, h.style].filter(Boolean).join(' · ') || 'Nón TCAPS'}
                  </p>
                  <span className="text-sm text-[#C9A84C] font-mono font-bold mt-1.5">{formatVnd(h.price)}</span>
                </div>
              </Link>

              {/* Action row — MUA (gold, left) + THỬ NÓN (outline, right) */}
              <div className="grid grid-cols-2 gap-1.5 p-2 border-t border-[#161616] bg-[#0D0D0D]">
                <Link
                  href={`/product/${encodeURIComponent(h.sku)}`}
                  aria-label={`Mua ${h.name}`}
                  className="h-10 rounded-lg bg-[#C9A84C] hover:bg-[#E8C96A] text-black text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                >
                  🛒 MUA
                </Link>
                <Link
                  href={`/try-on?sku=${encodeURIComponent(h.sku)}`}
                  aria-label={`Thử nón ${h.name}`}
                  className="h-10 rounded-lg border border-[#C9A84C]/60 hover:bg-[#C9A84C]/10 text-[#C9A84C] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                >
                  ✨ THỬ NÓN
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 text-center">
          <p className="font-bold text-[#C9A84C] mb-1 text-base">💰 Mua 2 nón + Free Ship chỉ 250K/2 nón</p>
          <p className="text-sm text-[#6B6B6B]">Liên hệ: 0972284146 · 332 Lê Văn Việt, TP.HCM</p>
        </div>
      </main>
    </div>
  )
}
