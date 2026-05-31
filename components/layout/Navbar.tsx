'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { PRODUCTS } from '@/constants/products'
import { proxyImg } from '@/lib/img'
import { TcapsLogo } from '@/components/icons/TcapsLogo'

const NAV_LINKS = [
  { href: '/',         label: 'TRANG CHỦ' },
  { href: '/try-on',   label: 'TRY-ON AI' },
  { href: '/catalog',  label: 'SẢN PHẨM' },
  { href: '/about',    label: 'VỀ TCAPS'  },
]

// diacritic-insensitive normaliser for search matching
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

export function Navbar() {
  const pathname   = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-[#0A0A0A] border-b border-[#181818]">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo — icon sits beside the shimmer wordmark. The SVG can't live
            inside the shimmer span (background-clip:text would render it
            transparent), so we put both inside a flex container and colour
            the SVG with the gold mid-stop to read as one logo. */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <TcapsLogo size={32} />
          <span className="text-2xl font-black tracking-[.12em] shimmer">TCAPS</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label }) => {
            const active = href === '/'
              ? pathname === '/'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'text-[11px] font-semibold tracking-[.16em] transition-colors duration-200 pb-0.5',
                  active
                    ? 'text-[#C9A84C] border-b border-[#C9A84C]'
                    : 'text-[#8A8A8A] hover:text-[#F5F5F5]',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Hat search (desktop) */}
          <HatSearch className="hidden lg:block w-56" />

          {/* Try-On CTA */}
          <Link
            href="/try-on"
            className="hidden md:inline-flex items-center gap-2 h-9 px-4 rounded-xl border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10 text-xs font-bold tracking-widest transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.4 3.6L12 6 8.4 7.4 7 11 5.6 7.4 2 6l3.6-1.4z" fill="currentColor"/>
            </svg>
            AI TRY-ON
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(p => !p)}
            className="md:hidden -mr-1.5 w-11 h-11 flex items-center justify-center text-[#6B6B6B] hover:text-[#F5F5F5]"
            aria-label="Menu"
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[#181818] bg-[#0A0A0A] px-4 py-4 flex flex-col gap-3">
          {/* Hat search (mobile) */}
          <HatSearch className="w-full mb-1" onNavigate={() => setOpen(false)} />
          {NAV_LINKS.map(({ href, label }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={[
                  'text-sm font-semibold tracking-widest py-3 border-b border-[#1A1A1A]',
                  active ? 'text-[#C9A84C]' : 'text-[#8A8A8A]',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
          <Link
            href="/try-on"
            onClick={() => setOpen(false)}
            className="mt-2 h-11 rounded-xl border border-[#C9A84C] text-[#C9A84C] text-xs font-bold tracking-widest flex items-center justify-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.4 3.6L12 6 8.4 7.4 7 11 5.6 7.4 2 6l3.6-1.4z" fill="currentColor"/>
            </svg>
            AI TRY-ON
          </Link>
        </div>
      )}
    </nav>
  )
}

// ── Hat search box with live product dropdown ──────────────────────────────
function HatSearch({ className = '', onNavigate }: { className?: string; onNavigate?: () => void }) {
  const router = useRouter()
  const [q, setQ]       = useState('')
  const [open, setOpen] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const results = useMemo(() => {
    const n = norm(q.trim())
    if (!n) return []
    return PRODUCTS
      .filter(p => norm(p.name).includes(n) || norm(p.sku).includes(n))
      .slice(0, 6)
  }, [q])

  const go = (sku: string) => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setQ(''); setOpen(false); onNavigate?.()
    router.push(`/try-on?sku=${encodeURIComponent(sku)}`)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-[#2A2A2A] bg-[#111111] focus-within:border-[#C9A84C]/60 transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#6B6B6B]">
          <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9.2 9.2L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150) }}
          onKeyDown={e => {
            if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() }
            if (e.key === 'Enter' && results[0]) go(results[0].sku)
          }}
          placeholder="Tìm nón…"
          className="flex-1 min-w-0 bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#6B6B6B] outline-none"
          aria-label="Tìm nón"
        />
        {q && (
          <button onMouseDown={e => e.preventDefault()} onClick={() => setQ('')} className="text-[#6B6B6B] hover:text-[#F5F5F5] shrink-0" aria-label="Xoá">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] shadow-[0_12px_40px_rgba(0,0,0,.6)] overflow-hidden z-50">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[#6B6B6B]">Không tìm thấy nón nào.</p>
          ) : (
            results.map(p => (
              <button
                key={p.sku}
                onMouseDown={e => e.preventDefault()}
                onClick={() => go(p.sku)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#C9A84C]/8 transition-colors border-b border-[#1A1A1A] last:border-0"
              >
                <span className="w-9 h-9 rounded-lg bg-[#0A0A0A] border border-[#222] overflow-hidden shrink-0 flex items-center justify-center">
                  {p.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={proxyImg(p.imageUrl, 64)} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    : <span className="text-[#4A4A4A] text-sm">🧢</span>}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-[#F5F5F5] truncate">{p.name}</span>
                  <span className="block text-[11px] text-[#C9A84C] font-mono">{p.priceBundle.toLocaleString('vi-VN')}đ</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#6B6B6B] shrink-0">Thử →</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
