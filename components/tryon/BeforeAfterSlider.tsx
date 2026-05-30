'use client'

import { useCallback, useRef, useState } from 'react'

interface Props {
  beforeUrl:    string
  afterUrl:     string
  beforeLabel?: string
  afterLabel?:  string
}

// Mobile-first before/after compare: ONE full-width image with a draggable
// divider (touch + mouse), so the original and result are never placed
// side-by-side on small screens. No horizontal overflow.
export function BeforeAfterSlider({
  beforeUrl, afterUrl, beforeLabel = 'Ảnh gốc', afterLabel = 'Ảnh try-on',
}: Props) {
  const [pos, setPos] = useState(50)        // 0–100, % of width showing the "before"
  const ref      = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const p = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.max(0, Math.min(100, p)))
  }, [])

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch {}
    setFromClientX(e.clientX)
  }
  const onMove = (e: React.PointerEvent) => { if (dragging.current) setFromClientX(e.clientX) }
  const onUp   = () => { dragging.current = false }
  const onKey  = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft')  setPos(p => Math.max(0, p - 4))
    if (e.key === 'ArrowRight') setPos(p => Math.min(100, p + 4))
  }

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      role="slider"
      aria-label="Kéo để so sánh ảnh gốc và ảnh try-on"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      tabIndex={0}
      onKeyDown={onKey}
      className="relative w-full overflow-hidden rounded-2xl border border-[#C9A84C]/30 bg-[#0A0A0A] select-none touch-none cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
      style={{ aspectRatio: '3 / 4' }}
    >
      {/* After (result) — full */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
      <span className="absolute top-3 right-3 z-20 text-[11px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-[#C9A84C] text-black uppercase pointer-events-none">
        {afterLabel}
      </span>

      {/* Before (original) — revealed on the left via clip-path */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl} alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />
      <span
        className="absolute top-3 left-3 z-20 text-[11px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-sm uppercase pointer-events-none transition-opacity"
        style={{ opacity: pos > 14 ? 1 : 0 }}
      >
        {beforeLabel}
      </span>

      {/* Divider + handle */}
      <div className="absolute top-0 bottom-0 z-30 w-[2px] bg-[#C9A84C] pointer-events-none" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#C9A84C] flex items-center justify-center shadow-[0_0_0_4px_rgba(10,10,10,.6)]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 5L3 9l3 4M12 5l3 4-3 4" stroke="#0A0A0A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
