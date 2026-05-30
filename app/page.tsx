import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { TcapsLogo } from '@/components/icons/TcapsLogo'
import { PRODUCTS as ALL_PRODUCTS } from '@/constants/products'
import { proxyImg } from '@/lib/img'

const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`

// Featured = first products that have a real photo.
const FEATURED = ALL_PRODUCTS.filter(p => p.imageUrl).slice(0, 4)

const STEPS = [
  { n: '01', title: 'Upload Selfie',      desc: 'Chụp ảnh tự sướng hoặc tải ảnh lên. Rõ mặt, đủ ánh sáng.' },
  { n: '02', title: 'AI Phân Tích',       desc: 'Hệ thống detect 478 điểm trên khuôn mặt, tính góc đầu.' },
  { n: '03', title: 'Gợi Ý & Thử Ảo',   desc: 'Chọn nón, AI scale đúng tỉ lệ và đặt lên đầu bạn.' },
  { n: '04', title: 'Tải Về & Chia Sẻ',  desc: 'Download ảnh hoặc share thẳng lên TikTok / Facebook.' },
]

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F5F5F5]">
      <Navbar />

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="pt-36 pb-28 px-4 text-center max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-[#C9A84C]/30 bg-[#C9A84C]/6 text-[#C9A84C] text-[11px] uppercase tracking-[.15em] px-3.5 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
          AI Virtual Try-On — Beta
        </div>

        {/* Headline — 2 lines: subject on top, gold-shimmer question below.
            line-height roomy enough for stacked VN marks (Ặ, Ợ, Ẫ) so they
            never clip the line above; size dialled down so 2 lines fit. */}
        <h1 className="font-black leading-[1.18] tracking-tight mb-8 pb-2" style={{ fontSize: 'clamp(2.25rem,7vw,4.75rem)' }}>
          <span className="block text-[#F5F5F5]">NÓN NÀO</span>
          <span className="block shimmer">HỢP MẶT BẠN?</span>
        </h1>

        <p className="text-[#F5F5F5]/45 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
          Upload selfie — AI phân tích khuôn mặt &amp; đội nón TCAPS lên đầu bạn.
          Realistic, đúng tỉ lệ.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/try-on"
            className="inline-flex items-center justify-center gap-2.5 h-14 px-8 rounded-xl bg-[#C9A84C] hover:bg-[#E8C96A] text-black font-bold text-base transition-all duration-200 shadow-[0_0_40px_rgba(201,168,76,.4)] hover:shadow-[0_0_60px_rgba(201,168,76,.6)] pulse-gold"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 18c0-4.4 3.58-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Thử Nón Ngay — Miễn Phí
          </Link>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-xl border border-[#222] hover:border-[#C9A84C]/40 text-[#F5F5F5]/60 hover:text-[#F5F5F5] text-base transition-all duration-200"
          >
            Xem bộ sưu tập
          </Link>
        </div>

      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how" className="border-t border-[#161616] bg-[#0D0D0D] py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[11px] uppercase tracking-[.18em] text-[#C9A84C] mb-3">Quy trình</p>
            <h2 className="text-3xl md:text-4xl font-black">4 bước đơn giản</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(s => (
              <div key={s.n} className="relative group">
                <div className="text-[56px] font-black text-[#C9A84C]/8 leading-none mb-3 select-none">{s.n}</div>
                <h3 className="font-bold text-[#F5F5F5] mb-2 text-sm">{s.title}</h3>
                <p className="text-sm text-[#6B6B6B] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────── */}
      <section className="border-t border-[#161616] bg-[#0D0D0D] py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[11px] uppercase tracking-[.18em] text-[#C9A84C] mb-2">Catalog</p>
              <h2 className="text-3xl font-black">Mẫu nón TCAPS</h2>
            </div>
            <Link href="/catalog" className="text-xs text-[#C9A84C] hover:text-[#E8C96A] flex items-center gap-1 transition-colors">
              Tất cả <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURED.map(p => (
              <Link
                key={p.sku} href={`/try-on?sku=${encodeURIComponent(p.sku)}`}
                aria-label={`Thử nón ${p.name}`}
                className="group rounded-2xl border border-[#161616] bg-[#111] overflow-hidden transition-all duration-300 hover:border-[#C9A84C]/50 hover:-translate-y-1 hover:shadow-[0_12px_34px_-12px_rgba(201,168,76,0.3)]"
              >
                <div className="h-44 md:h-52 flex items-center justify-center relative overflow-hidden bg-[#0A0A0A]">
                  <Image
                    src={proxyImg(p.imageUrl)}
                    alt={p.name}
                    fill
                    unoptimized
                    sizes="(max-width:768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {p.badge && (
                    <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#C9A84C] text-black tracking-wide z-10">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="p-3 border-t border-[#161616]">
                  <p className="text-sm font-semibold text-[#F5F5F5] truncate" title={p.name}>{p.name}</p>
                  <p className="text-xs text-[#5A5A5A] mt-0.5 truncate">{[p.line, p.style].filter(Boolean).join(' · ') || 'Nón TCAPS'}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-[#C9A84C] font-mono font-semibold">{formatVnd(p.price)}</span>
                    <span className="text-xs text-[#C9A84C]/70 group-hover:text-[#C9A84C] transition-colors">Thử →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <p className="text-center text-xs text-[#3A3A3A] mt-6">Mua 1: 149,000₫ · Mua 2 nón + Free Ship chỉ 250K/2 nón</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[#161616] py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#3A3A3A]">
          <span className="inline-flex items-center gap-2 text-lg font-black tracking-widest text-[#C9A84C]">
            <TcapsLogo size={26} />
            TCAPS
          </span>
          <span>332 Lê Văn Việt, TP. Hồ Chí Minh · 0972284146 · 24/7</span>
          <span>© 2025 TCAPS — Nón Thời Trang</span>
        </div>
      </footer>
    </div>
  )
}
