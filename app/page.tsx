import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/layout/Navbar'
import { TcapsLogo } from '@/components/icons/TcapsLogo'
import { CartIcon, SparkleIcon } from '@/components/ui/icons'
import { PRODUCTS as ALL_PRODUCTS } from '@/constants/products'
import { proxyImg } from '@/lib/img'

const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`

// Featured = first products that have a real photo.
const FEATURED = ALL_PRODUCTS.filter(p => p.imageUrl).slice(0, 4)

// Lifestyle / model shots displayed in the auto-scrolling banner above the
// "Quy trình" section. Files live under /public — add or remove here to change
// the banner. The strip duplicates this list inline for the seamless loop.
const BANNER_IMAGES = [
  '/z7881892796228_a81f3a2a32e31a4de074c3e83372edfa.jpg',
  '/z7881892799448_2013ccf22d14e701231e6e49538383b3.jpg',
  '/z7881892806827_54c6c0d0744ec8bd222a85dc022d3c7b.jpg',
  '/z7881892807575_c18bf32d249d95c976779564fba382ee.jpg',
  '/z7881919534291_ac404ae1c75f8b578cc4724eac532432.jpg',
  '/z7881919539692_d3dc81e31e4315c8743bba3462afb200.jpg',
  '/z7881919539909_ba886c9f033f15023c10c30258a75719.jpg',
]

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
      <section className="pt-32 pb-24 px-4 text-center max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-[#C9A84C]/30 bg-[#C9A84C]/6 text-[#C9A84C] text-[11px] uppercase tracking-[.15em] px-3.5 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
          AI Virtual Try-On — Beta
        </div>

        {/* Before / After hero — same person on the left, then AI-generated
            try-on on the right. Square 1:1 cards in one row on every screen
            (mobile shrinks the cards rather than stacking); a gold arrow
            points from original → AI result so the storytelling reads
            left-to-right. */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-5 items-center max-w-3xl mx-auto mb-8">
          <HeroBeforeAfterCard
            src="/z7884987169122_035798bb97064f38f9cb9e13c83b773b.jpg"
            label="Ảnh gốc"
            accent="muted"
            priority
          />
          <div className="flex items-center justify-center text-[#C9A84C] shrink-0">
            <svg className="w-5 h-5 sm:w-10 sm:h-10" viewBox="0 0 32 32" fill="none">
              <path d="M6 16h20M20 9l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <HeroBeforeAfterCard
            src="/be658d6c-9c50-4344-86dd-1098ca548dcd.png"
            label="AI Try-On"
            accent="gold"
            priority
          />
        </div>

        <p className="text-[#F5F5F5]/55 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
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

      {/* ── Lifestyle banner (auto-scroll marquee) ───────── */}
      <section className="border-t border-[#161616] bg-[#0A0A0A] py-12 md:py-14 overflow-hidden">
        <div className="text-center mb-6 md:mb-8 px-4">
          <p className="text-[11px] uppercase tracking-[.18em] text-[#C9A84C] mb-2">Lookbook</p>
          <h2 className="text-2xl md:text-3xl font-black text-[#F5F5F5]">Phong cách TCAPS</h2>
        </div>
        {/* The track holds TWO copies of the list back-to-back; the CSS
            animation scrolls -50% so the seam between copies lands at the
            start of the second copy, producing a seamless infinite loop. */}
        <div className="marquee-track gap-3 md:gap-4 will-change-transform">
          {[...BANNER_IMAGES, ...BANNER_IMAGES].map((src, i) => (
            <div
              key={i}
              className="shrink-0 w-40 md:w-56 lg:w-64 aspect-[3/4] rounded-2xl overflow-hidden border border-[#1E1E1E] bg-[#0D0D0D] relative"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width:768px) 160px, (max-width:1024px) 224px, 256px"
                className="object-cover"
                aria-hidden="true"
              />
            </div>
          ))}
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
              <div
                key={p.sku}
                className="group flex flex-col rounded-2xl border border-[#161616] bg-[#111] overflow-hidden transition-all duration-300 hover:border-[#C9A84C]/50 hover:-translate-y-1 hover:shadow-[0_12px_34px_-12px_rgba(201,168,76,0.3)]"
              >
                <Link href={`/product/${encodeURIComponent(p.sku)}`} className="flex flex-col flex-1" aria-label={p.name}>
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
                  <div className="p-3 border-t border-[#161616] flex flex-col flex-1">
                    <p className="text-sm font-semibold text-[#F5F5F5] truncate" title={p.name}>{p.name}</p>
                    <p className="text-xs text-[#5A5A5A] mt-0.5 truncate">{[p.line, p.style].filter(Boolean).join(' · ') || 'Nón TCAPS'}</p>
                    <span className="text-sm text-[#C9A84C] font-mono font-semibold mt-2">{formatVnd(p.price)}</span>
                  </div>
                </Link>
                {/* MUA (left) + THỬ NÓN (right) — matches catalog card layout. */}
                <div className="grid grid-cols-2 gap-1.5 p-2 border-t border-[#161616] bg-[#0D0D0D]">
                  <Link
                    href={`/product/${encodeURIComponent(p.sku)}`}
                    aria-label={`Mua ${p.name}`}
                    className="h-10 rounded-lg bg-[#C9A84C] hover:bg-[#E8C96A] text-black text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CartIcon size={14} />
                    MUA
                  </Link>
                  <Link
                    href={`/try-on?sku=${encodeURIComponent(p.sku)}`}
                    aria-label={`Thử nón ${p.name}`}
                    className="h-10 rounded-lg border border-[#C9A84C]/60 hover:bg-[#C9A84C]/10 text-[#C9A84C] text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <SparkleIcon size={14} />
                    THỬ NÓN
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-[#3A3A3A] mt-6">1 nón 130K · 2 nón 250K · 3 nón 370K · 4 nón 516K tặng 1 · 5 nón 650K tặng 1 · Freeship từ 2 nón</p>
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

// Square 1:1 card used in the hero before/after pair. `accent="gold"` lights
// the border in gold for the AI result side; `muted` is the neutral side
// for the original photo. priority=true so the first paint includes both
// images (this IS the hero — no above-the-fold deferral makes sense).
function HeroBeforeAfterCard({
  src, label, accent, priority,
}: { src: string; label: string; accent: 'gold' | 'muted'; priority?: boolean }) {
  return (
    <div
      className={[
        'relative aspect-square rounded-2xl overflow-hidden border-2 bg-[#0A0A0A] transition-all duration-300',
        accent === 'gold'
          ? 'border-[#C9A84C]/60 shadow-[0_0_40px_rgba(201,168,76,.25)] hover:shadow-[0_0_60px_rgba(201,168,76,.4)]'
          : 'border-[#222] hover:border-[#444]',
      ].join(' ')}
    >
      <Image
        src={src}
        alt={label}
        fill
        sizes="(max-width:640px) 90vw, 380px"
        priority={priority}
        className="object-cover"
      />
      <span
        className={[
          'absolute top-1.5 left-1.5 sm:top-3 sm:left-3 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-[.1em] sm:tracking-[.15em] backdrop-blur-sm',
          accent === 'gold'
            ? 'bg-[#C9A84C] text-black'
            : 'bg-[#0A0A0A]/80 text-[#F5F5F5] border border-[#2A2A2A]',
        ].join(' ')}
      >
        {label}
      </span>
    </div>
  )
}
