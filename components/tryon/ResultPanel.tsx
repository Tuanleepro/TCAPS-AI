'use client'

import { useState } from 'react'
import type { FaceShape } from '@/types'
import type { Product }   from '@/constants/products'
import type { QcScore }   from '@/lib/gemini/qcScore'
import { FACE_SHAPE_LABELS, PRODUCTS } from '@/constants/products'
import { scoreCompatibility, rankCompatibility } from '@/lib/recommendation-engine'
import type { FaceShapeProbabilities } from '@/lib/face-analysis'
import { BeforeAfterSlider } from './BeforeAfterSlider'
import { OrderModal } from './OrderModal'
import { proxyImg } from '@/lib/img'

interface Props {
  resultUrl:   string
  originalUrl: string
  product:     Product | null
  faceShape:   FaceShape | null
  faceScores?: FaceShapeProbabilities | null
  enhanced:    boolean
  renderMs?:   number | null
  qc?:         QcScore | null     // Gemini Vision QC scores — only shown when present (passed)
  onDownload:  () => void
  onRetry:     () => void
  onReset:     () => void
  onTryProduct?: (product: Product) => void   // try a recommended hat in-place
}

export function ResultPanel({
  resultUrl, originalUrl, product, faceShape, faceScores, enhanced, renderMs, qc,
  onDownload, onRetry, onReset, onTryProduct,
}: Props) {
  // Real face data only: a % is shown ONLY when there is a measured distribution.
  const hasFaceData   = !!(faceShape && faceScores)
  const compat        = hasFaceData && product ? scoreCompatibility(product, faceShape) : null
  const compatibility = compat?.score ?? null
  const shapeLabel    = faceShape ? FACE_SHAPE_LABELS[faceShape] : null
  const shapeProb     = hasFaceData ? faceScores![faceShape!] : null
  // Top-3 measured shapes for the breakdown line.
  const topShapes = hasFaceData
    ? (Object.entries(faceScores!) as Array<[FaceShape, number]>)
        .sort((a, b) => b[1] - a[1]).slice(0, 3)
    : []
  // Highest-compatibility hats for THIS face — more choices for the customer.
  const recommendations = hasFaceData
    ? rankCompatibility(PRODUCTS, faceShape!, { excludeSku: product?.sku, limit: 4 })
    : []

  const [orderOpen, setOrderOpen] = useState(false)

  return (
    <div className="flex flex-col gap-0 fade-in-up w-full">

      {/* ── Title ───────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#F5F5F5]">
          KẾT QUẢ TRY-ON{' '}
          <span className="text-[#C9A84C]">✦</span>
        </h2>
        <p className="text-sm text-[#6B6B6B] mt-1">AI đã mô phỏng nón lên ảnh của bạn</p>
        <div className="flex justify-center mt-2">
          {enhanced ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#C9A84C]/12 text-[#C9A84C] border border-[#C9A84C]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] pulse-gold" />
              Tạo bởi Gemini AI{renderMs ? ` · ${(renderMs / 1000).toFixed(1)}s` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full bg-[#1E1E1E] text-[#6B6B6B] border border-[#2A2A2A]">
              Ghép ảnh · AI relight chưa chạy (kiểm tra API key / mạng)
            </span>
          )}
        </div>
      </div>

      {/* ── Before / After compare (mobile-friendly, never side-by-side) ─────── */}
      <div className="w-full max-w-md mx-auto mb-2">
        <BeforeAfterSlider beforeUrl={originalUrl} afterUrl={resultUrl} />
      </div>
      <p className="text-center text-xs text-[#6B6B6B] mb-4">Kéo thanh trượt để so sánh ảnh gốc ↔ ảnh try-on</p>

      {/* ── Gemini Vision QC checklist — only shown when QC passed ────────── */}
      {qc && <QcChecklist qc={qc} />}

      {/* ── Product info + compatibility card ────────────────── */}
      {/* Top row (thumbnail + name/price + MUA NGAY) reads left-to-right at
          every breakpoint, so the buy CTA sits beside the cap name on mobile.
          The compatibility breakdown lives in a full-width row below, separated
          by a hairline divider, instead of the old 3-column grid which pushed
          the CTA to a stacked third row on mobile. */}
      <div className="rounded-2xl border border-[#1E1E1E] bg-[#111111] overflow-hidden mb-3">

        {/* Top row: thumb + info + buy CTA */}
        <div className="flex items-start gap-3 p-4">
          {/* Hat thumbnail */}
          <div className="w-[60px] h-[60px] rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] flex items-center justify-center shrink-0 overflow-hidden">
            {product?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proxyImg(product.imageUrl, 96)} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-contain p-1" />
            ) : (
              <HatPlaceholder />
            )}
          </div>

          {/* Name + price */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-black text-[#F5F5F5] text-sm sm:text-base leading-tight">
                {product?.name ?? 'Custom Hat'}
              </span>
              {product?.badge && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#C9A84C] text-black tracking-wider shrink-0">
                  {product.badge}
                </span>
              )}
            </div>
            <div className="text-[#C9A84C] font-bold text-sm font-mono">
              {product ? `${product.priceBundle.toLocaleString('vi-VN')}đ` : '99.000đ'}
            </div>
          </div>

          {/* Buy CTA — pinned right of name. Opens the in-page order modal so
              the customer fills shipping info + optional upsell items without
              leaving the try-on result they just generated. */}
          <button
            type="button"
            onClick={() => product && setOrderOpen(true)}
            disabled={!product}
            aria-label="Mua nón này"
            className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 sm:px-5 rounded-xl bg-[#C9A84C] hover:bg-[#E8C96A] text-black font-black text-[11px] sm:text-xs tracking-wider transition-all duration-200 shadow-[0_0_20px_rgba(201,168,76,.3)] hover:shadow-[0_0_32px_rgba(201,168,76,.5)] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1.5 1.5h3l1.8 8h6l1.2-5.5H4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="7.5" cy="13" r="1.2" fill="currentColor"/>
              <circle cx="12" cy="13" r="1.2" fill="currentColor"/>
            </svg>
            MUA NGAY
          </button>
        </div>

        {/* Bottom row: face compatibility breakdown */}
        <div className="border-t border-[#1E1E1E] p-4 flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#C9A84C] mb-1">
            Phù hợp với khuôn mặt bạn
          </p>

          {!hasFaceData ? (
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              Chưa đủ dữ liệu để phân tích khuôn mặt.
            </p>
          ) : (
            <>
              {/* Detected shape + its measured probability */}
              <div className="flex items-center gap-2">
                <FaceIcon />
                <span className="text-sm text-[#F5F5F5]">
                  Khuôn mặt: <span className="font-semibold">{shapeLabel}</span>
                  <span className="text-[#6B6B6B]"> · {shapeProb}%</span>
                </span>
              </div>

              {/* Top-3 measured distribution */}
              <div className="flex flex-wrap gap-1">
                {topShapes.map(([s, p]) => (
                  <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#2A2A2A] text-[#8A8A8A]">
                    {FACE_SHAPE_LABELS[s]} {p}%
                  </span>
                ))}
              </div>

              {/* Compatibility — only when the product has usable metadata */}
              {compatibility !== null ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldIcon />
                    <span className="text-sm text-[#F5F5F5]">
                      Độ phù hợp:{' '}
                      <span className="font-bold text-[#C9A84C]">{compatibility}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#1E1E1E] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] transition-all duration-1000"
                      style={{ width: `${compatibility}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                  Chưa đủ dữ liệu để tính độ phù hợp.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Regenerate — moved ABOVE the analysis card. Reason: the user is
          most likely to want another generation right after seeing the
          result, so it should be the first action they can reach instead of
          buried below recommendations. */}
      <button
        onClick={onRetry}
        className="flex items-center justify-center gap-2 w-full h-11 mb-4 rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/8 hover:bg-[#C9A84C]/14 text-[#C9A84C] font-bold text-xs uppercase tracking-widest transition-all duration-200"
      >
        <RetryIcon />
        Tạo lại kết quả
      </button>

      {/* ── Phân tích (data-grounded, no marketing) ───────────── */}
      {compat && (
        <div className="rounded-2xl border border-[#1E1E1E] bg-[#0D0D0D] p-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#C9A84C] mb-2">
            Phân tích
          </p>
          <p className="text-sm text-[#C8C8C8] leading-relaxed">{compat.explanation}</p>
          <p className="text-[10px] text-[#4A4A4A] mt-2 font-mono">
            Điểm gốc = 70%·form-mặt({compat.faceShapeMatch}) + 20%·kiểu({compat.styleMatch}) + 10%·metadata({compat.productWeight}) = {compat.rawScore}
            {' '}→ thang 80–100: <span className="text-[#6B6B6B]">{compat.score}%</span>
          </p>
        </div>
      )}

      {/* ── Gợi ý nón hợp nhất với khuôn mặt (more choices) ────── */}
      {recommendations.length > 0 && (
        <div className="rounded-2xl border border-[#1E1E1E] bg-[#111111] p-4 mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#C9A84C]">
              Nón hợp nhất với bạn
            </p>
            {shapeLabel && (
              <span className="text-[10px] text-[#6B6B6B]">khuôn mặt {shapeLabel}</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {recommendations.map(({ product: rp, compat: rc }) => (
              <a
                key={rp.sku}
                href={`/try-on?sku=${encodeURIComponent(rp.sku)}`}
                onClick={(e) => { if (onTryProduct) { e.preventDefault(); onTryProduct(rp) } }}
                className="group flex flex-col rounded-xl border border-[#2A2A2A] bg-[#0D0D0D] overflow-hidden hover:border-[#C9A84C]/50 transition-all duration-200"
                title={`Thử ${rp.name}`}
              >
                <div className="relative w-full bg-[#0A0A0A] flex items-center justify-center overflow-hidden" style={{ height: '112px' }}>
                  {rp.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    // INLINE height (not Tailwind class) — class-based height collapsed the thumbnail to a strip on iOS Safari/Zalo (see HatPicker).
                    <img src={proxyImg(rp.imageUrl, 256)} alt={rp.name} loading="lazy" decoding="async" style={{ width: '100%', height: '112px', objectFit: 'cover', display: 'block' }} draggable={false} />
                  ) : (
                    <HatPlaceholder />
                  )}
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#C9A84C] text-black tabular-nums">
                    {rc.score}%
                  </span>
                </div>
                <div className="p-2 flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold text-[#F5F5F5] leading-tight truncate" title={rp.name}>{rp.name}</span>
                  <span className="text-xs text-[#C9A84C] font-mono">{rp.priceBundle.toLocaleString('vi-VN')}đ</span>
                  <span className="mt-1.5 inline-flex items-center justify-center gap-1 h-9 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C] text-[11px] font-bold uppercase tracking-wider group-hover:bg-[#C9A84C] group-hover:text-black transition-colors">
                    Thử nón này
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Action buttons ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <ActionBtn onClick={onDownload} icon={<DownloadIcon />} label="TẢI ẢNH" />
        <ActionBtn onClick={onReset}    icon={<SwapIcon />}     label="ĐỔI ẢNH KHÁC" />
      </div>

      {/* Order modal — mounted in DOM but only renders when `open` is true. */}
      {product && (
        <OrderModal
          open={orderOpen}
          product={product}
          onClose={() => setOrderOpen(false)}
        />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────

function QcChecklist({ qc }: { qc: QcScore }) {
  // 3 rows: face / hat / realism. Each rendered ONLY when ≥ its pass threshold,
  // so a fail never shows up here (the API blocks the result before it reaches
  // this panel — this is a defence-in-depth check).
  const rows: Array<{ label: string; pct: number }> = [
    { label: 'Giữ khuôn mặt', pct: qc.face_similarity },
    { label: 'Đúng sản phẩm', pct: qc.hat_similarity  },
    { label: 'Độ chân thực',  pct: qc.realism         },
  ]
  return (
    <div className="rounded-2xl border border-[#C9A84C]/25 bg-[#C9A84C]/6 p-3 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#C9A84C] mb-2">
        Đã kiểm định AI
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        {rows.map(r => (
          <li key={r.label} className="flex items-center gap-2 text-sm text-[#F5F5F5]">
            <span aria-hidden className="w-4 h-4 rounded-full bg-[#C9A84C] text-black flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                <path d="M3 7.5l2.5 2.5L11 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="flex-1">{r.label}:</span>
            <span className="font-mono font-bold text-[#C9A84C] tabular-nums">{r.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ActionBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 px-2 min-h-[56px] rounded-xl border border-[#1E1E1E] bg-[#0D0D0D] hover:border-[#C9A84C]/40 hover:text-[#C9A84C] text-[#6B6B6B] transition-all duration-200 text-[10px] font-bold uppercase tracking-widest"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function HatPlaceholder() {
  return (
    <svg viewBox="0 0 60 40" fill="none" className="w-10 opacity-40">
      <path d="M5 28 Q30 8 55 28 L57 32 Q30 24 3 32 Z" fill="#C9A84C"/>
      <rect x="2" y="31" width="56" height="5" rx="2.5" fill="#C9A84C"/>
    </svg>
  )
}

function FaceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#C9A84C]">
      <circle cx="7" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 13c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#C9A84C]">
      <path d="M7 1.5L2 3.5v4c0 2.8 2.1 4.9 5 5.5 2.9-.6 5-2.7 5-5.5v-4L7 1.5z" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v8M5 7l3 3 3-3M2 12.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const RetryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 8a6 6 0 0011-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M2 4.5v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
const SwapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 5h8M9 3l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13 11H5M7 13l-2-2 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
