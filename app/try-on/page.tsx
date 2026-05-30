'use client'

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useTryOn }    from '@/hooks/useTryOn'
import { UploadZone }  from '@/components/tryon/UploadZone'
import { FaceLoader }  from '@/components/tryon/FaceLoader'
import { ResultPanel } from '@/components/tryon/ResultPanel'
import { Button }      from '@/components/ui/Button'
import { Navbar }      from '@/components/layout/Navbar'
import { PRODUCTS, PRODUCT_MAP, type Product } from '@/constants/products'
import { proxyImg } from '@/lib/img'

const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}₫`

// diacritic-insensitive search for the hat picker
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')

// Every real product the customer can pick from (has a photo).
const PICKABLE = PRODUCTS.filter(p => p.imageUrl)

// Default hat used when the URL ?sku is missing/invalid (requirement: fallback).
const DEFAULT_PRODUCT: Product | null = PRODUCTS.find(p => p.imageUrl) ?? PRODUCTS[0] ?? null

// Fetch a product photo and turn it into a File so it can feed the AI try-on
// pipeline exactly like a user-uploaded hat. content.pancake.vn allows CORS,
// so the browser can read the bytes directly (no server proxy needed).
async function productImageToFile(url: string, sku: string): Promise<File> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  return new File([blob], `${sku}.${ext}`, { type: blob.type || 'image/jpeg' })
}

export default function TryOnPage() {
  return (
    <div className="min-h-dvh bg-[#0A0A0A] flex flex-col">
      <Navbar />
      <Suspense fallback={<MainFallback />}>
        <TryOnMain />
      </Suspense>
    </div>
  )
}

function MainFallback() {
  return (
    <main className="flex-1 pt-16 flex items-center justify-center">
      <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#2A2A2A" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </main>
  )
}

function TryOnMain() {
  const { state, setFaceFile, setHatFile, runTryOn, retry, reset, download, canRun } = useTryOn()
  const searchParams = useSearchParams()
  const skuParam = searchParams.get('sku')

  // Resolve the product the user picked in the Catalog. If the ?sku is unknown,
  // fall back to the default hat (never leave the user stranded).
  const fromCatalog: Product | null = skuParam
    ? (PRODUCT_MAP[skuParam] ?? DEFAULT_PRODUCT)
    : null

  const [hatLoading, setHatLoading] = useState(false)
  const appliedSkuRef = useRef<string | null>(null)

  // Auto-load the catalog hat into the try-on pipeline once per distinct SKU.
  // Guard is set synchronously before the fetch so React 18 Strict Mode's
  // double-invoke can't kick off two loads or drop the result.
  useEffect(() => {
    if (!fromCatalog?.imageUrl) return
    if (appliedSkuRef.current === fromCatalog.sku) return
    const { sku, imageUrl } = fromCatalog
    appliedSkuRef.current = sku
    setHatLoading(true)
    productImageToFile(imageUrl, sku)
      .then(file => setHatFile(file, sku))
      .catch(err => { appliedSkuRef.current = null; console.warn('[TryOn] auto-load hat failed:', err) })
      .finally(() => setHatLoading(false))
  }, [fromCatalog, setHatFile])

  const LOADING_STEPS = ['detecting', 'compositing', 'processing'] as const
  const isLoading  = (LOADING_STEPS as readonly string[]).includes(state.step)
  const isDone     = state.step === 'done'
  const isError    = state.step === 'error'
  const isIdle     = !isLoading && !isDone && !isError

  // Product shown in the result/recommendation card (selected SKU is the truth).
  const product  = state.selectedSku ? PRODUCT_MAP[state.selectedSku] ?? null : null
  const faceShape = state.faceResult?.faceShape ?? null

  // Pick a hat from the in-page product grid: fetch its photo → load it as the
  // hat (same pipeline as catalog ?sku / file upload). Does NOT auto-run — the
  // user still presses "Thử Nón Ngay" once the selfie is added too.
  const pickProduct = useCallback((p: Product) => {
    if (!p.imageUrl || hatLoading) return
    appliedSkuRef.current = p.sku                      // block the ?sku effect from re-loading
    setHatLoading(true)
    productImageToFile(p.imageUrl, p.sku)
      .then(file => setHatFile(file, p.sku))
      .catch(err => console.warn('[TryOn] pick hat failed:', err))
      .finally(() => setHatLoading(false))
  }, [setHatFile, hatLoading])

  // Try a recommended hat in-place: swap the cap, keep the SAME uploaded face,
  // and re-run the AI try-on — no re-upload, no page navigation.
  const tryProduct = useCallback((p: Product) => {
    if (!p.imageUrl) return
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    setHatLoading(true)
    appliedSkuRef.current = p.sku                      // block the ?sku effect from re-loading
    productImageToFile(p.imageUrl, p.sku)
      .then(file => { setHatFile(file, p.sku); runTryOn() })
      .catch(err => console.warn('[TryOn] try recommended hat failed:', err))
      .finally(() => setHatLoading(false))
  }, [setHatFile, runTryOn])

  return (
    <main className="flex-1 pt-16">
      {/* ── Result ─────────────────────────────────────── */}
      {isDone && state.resultUrl && state.faceUrl && (
        <div className="max-w-3xl mx-auto px-4 py-10">
          <ResultPanel
            resultUrl={state.resultUrl}
            originalUrl={state.faceUrl}
            product={product}
            faceShape={faceShape}
            faceScores={state.faceResult?.faceShapeScores ?? null}
            enhanced={state.enhanced}
            renderMs={state.renderMs}
            qc={state.qc}
            onDownload={download}
            onRetry={retry}
            onReset={reset}
            onTryProduct={tryProduct}
          />
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────── */}
      {isLoading && (
        <div className="max-w-md mx-auto px-4 py-10">
          <FaceLoader step={state.step} />
        </div>
      )}

      {/* ── Error ──────────────────────────────────────── */}
      {isError && (
        <div className="max-w-md mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center fade-in-up">
          <div className="w-16 h-16 rounded-full border border-[#E05252]/30 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <circle cx="13" cy="13" r="11" stroke="#E05252" strokeWidth="1.5"/>
              <path d="M13 7v7M13 17v2" stroke="#E05252" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-[#E05252] mb-1">Đã xảy ra lỗi</p>
            <p className="text-sm text-[#6B6B6B] max-w-xs">{state.errorMessage}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
            {canRun && (
              <Button variant="gold" fullWidth onClick={retry}>Thử lại</Button>
            )}
            <Button variant="outline" fullWidth onClick={reset}>Đổi ảnh khác</Button>
          </div>
        </div>
      )}

      {/* ── Upload form ─────────────────────────────────── */}
      {isIdle && (
        <div className="max-w-md mx-auto px-4 pt-10 pb-32 flex flex-col gap-6 fade-in-up">

          {/* Hero text */}
          <div className="text-center pb-2">
            <h1 className="text-2xl font-black text-[#F5F5F5] mb-1">Thử Nón AI</h1>
            <p className="text-sm text-[#6B6B6B]">
              Upload selfie → AI đội nón lên đầu bạn
            </p>
          </div>

          {/* Step pills */}
          <StepBar step={state.step} />

          {/* Selfie upload */}
          <UploadZone
            type="face" file={state.faceFile} previewUrl={state.faceUrl}
            onFile={setFaceFile}
          />

          {/* Hat picker — choose from ALL products (no PNG upload needed) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[.15em] text-[#C9A84C]">Chọn nón</span>
              {product && <span className="text-xs text-[#6B6B6B] truncate max-w-[180px]">Đã chọn: {product.name}</span>}
            </div>
            {product && <SelectedHatBanner product={product} loading={hatLoading} />}
            <PickerBoundary products={PICKABLE} onPick={pickProduct}>
              <HatPicker selectedSku={state.selectedSku} loading={hatLoading} onPick={pickProduct} />
            </PickerBoundary>
          </div>

          {/* Ready hint */}
          {state.step === 'both-ready' && (
            <div className="rounded-xl border border-[#C9A84C]/25 bg-[#C9A84C]/6 px-4 py-3">
              <p className="text-sm text-[#C9A84C] font-semibold mb-0.5">Sẵn sàng!</p>
              <p className="text-sm text-[#F5F5F5]/50">
                AI TCAPS sẽ đội nón lên đầu bạn và render lại thành ảnh thật.
              </p>
            </div>
          )}

          {/* Tips */}
          {state.step === 'idle' && (
            <ul className="space-y-1.5 pt-1">
              {[
                'Ảnh selfie rõ mặt, đủ ánh sáng, nhìn thẳng hoặc nghiêng nhẹ',
                'Không che mặt bằng tay, kính, hoặc phụ kiện',
                'Chọn 1 mẫu nón TCAPS bên dưới — AI sẽ đội đúng mẫu đó lên đầu bạn',
                'Bấm "Thử Nón Ngay" sau khi đã có ảnh selfie và chọn nón',
              ].map(t => (
                <li key={t} className="flex items-start gap-2 text-sm text-[#6B6B6B]">
                  <span className="text-[#C9A84C] mt-0.5 shrink-0 text-[8px]">◆</span>{t}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Sticky bottom CTA (idle/upload state only) ────── */}
      {isIdle && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1E1E1E] bg-[#0A0A0A]/95 backdrop-blur-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto">
            <Button
              variant="gold"
              size="lg"
              fullWidth
              disabled={!canRun}
              loading={state.isProcessing}
              onClick={runTryOn}
            >
              {state.isProcessing ? 'Đang xử lý…' : 'Thử Nón Ngay'}
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

// Safety net: if the hat grid ever throws on a device we can't reproduce
// (e.g. an unsupported API on an old mobile WebKit), surface the error and
// fall back to a no-image name list so the customer can still pick a hat.
class PickerBoundary extends Component<
  { products: Product[]; onPick: (p: Product) => void; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[HatPicker] render crashed:', error, info.componentStack)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="rounded-xl border border-[#E05252]/40 bg-[#E05252]/6 p-3">
        <p className="text-xs text-[#E05252] mb-2">
          Lưới nón gặp lỗi hiển thị ({this.state.error.message}). Chọn nhanh bên dưới:
        </p>
        <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
          {this.props.products.map(p => (
            <button
              key={p.sku} type="button" onClick={() => this.props.onPick(p)}
              className="text-left text-[12px] text-[#F5F5F5] border border-[#2A2A2A] rounded-lg px-2.5 py-2.5 hover:border-[#C9A84C]/50 active:bg-[#C9A84C]/10 transition-colors"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    )
  }
}

function SelectedHatBanner({ product, loading }: { product: Product; loading: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#C9A84C]/25 bg-[#C9A84C]/6 p-3 fade-in-up">
      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#0A0A0A] shrink-0 flex items-center justify-center">
        {product.imageUrl ? (
          <Image
            src={proxyImg(product.imageUrl, 96)}
            alt={product.name}
            fill
            unoptimized
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <span className="text-[#4A4A4A] text-lg">🧢</span>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]/60">
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#2A2A2A" strokeWidth="3" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[.15em] text-[#C9A84C]">Nón đã chọn</p>
        <p className="text-sm font-bold text-[#F5F5F5] truncate" title={product.name}>{product.name}</p>
        <p className="text-xs text-[#C9A84C] font-mono">{formatVnd(product.price)}</p>
      </div>
    </div>
  )
}

// Scrollable grid of ALL products — pick one to try on (replaces PNG upload).
function HatPicker({ selectedSku, loading, onPick }: {
  selectedSku: string | null
  loading: boolean
  onPick: (p: Product) => void
}) {
  const [q, setQ] = useState('')
  const items = useMemo(() => {
    const n = norm(q.trim())
    return n ? PICKABLE.filter(p => norm(p.name).includes(n) || norm(p.sku).includes(n)) : PICKABLE
  }, [q])

  return (
    <div className="flex flex-col gap-2">
      {/* filter */}
      <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-[#222] bg-[#0D0D0D] focus-within:border-[#C9A84C]/50 transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-[#6B6B6B]">
          <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M9.2 9.2L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder={`Tìm trong ${PICKABLE.length} mẫu nón…`}
          className="flex-1 min-w-0 bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#6B6B6B] outline-none"
          aria-label="Tìm nón"
        />
        {q && (
          <button onClick={() => setQ('')} className="text-[#6B6B6B] hover:text-[#F5F5F5] shrink-0 w-6 h-6 flex items-center justify-center" aria-label="Xoá">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>

      {/* grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto pr-1 rounded-xl">
        {items.length === 0 ? (
          <p className="col-span-full text-center text-sm text-[#6B6B6B] py-8">Không tìm thấy nón nào.</p>
        ) : items.map(p => {
          const sel = p.sku === selectedSku
          return (
            <button
              key={p.sku}
              type="button"
              onClick={() => onPick(p)}
              aria-pressed={sel}
              className={[
                'group relative block w-full rounded-xl border text-left',
                sel ? 'border-[#C9A84C] ring-2 ring-[#C9A84C]/50' : 'border-[#1E1E1E]',
              ].join(' ')}
            >
              {/* Image height is set via INLINE STYLE, not a Tailwind class.
                  On the user's iOS Safari/Zalo WebView the class-based height
                  (`h-28`) did not take effect and the thumbnail collapsed to a
                  thin strip; an inline height renders reliably (no dependency on
                  the external stylesheet loading/applying). Confirmed fixed on a
                  real device. */}
              <span style={{ display: 'block', position: 'relative', height: '112px', background: '#0A0A0A' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxyImg(p.imageUrl, 256)}
                  alt={p.name}
                  decoding="async"
                  style={{ width: '100%', height: '112px', objectFit: 'contain', display: 'block' }}
                />
                {sel && (
                  <span style={{ position: 'absolute', inset: 0, background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ width: 24, height: 24, borderRadius: 999, background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4" stroke="#0A0A0A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </span>
                )}
              </span>
              <span className="block px-1.5 py-1.5 text-[11px] font-semibold text-[#F5F5F5] leading-tight line-clamp-2 min-h-[2.6em]">{p.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepBar({ step }: { step: string }) {
  const steps = [
    { label: 'Selfie',  done: ['face-ready','hat-ready','both-ready','done'].includes(step) },
    { label: 'Chọn nón', done: ['hat-ready','both-ready','done'].includes(step) },
    { label: 'Kết quả', done: step === 'done' },
  ]
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-1">
          <div className={[
            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300',
            s.done ? 'bg-[#C9A84C] text-black' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#4A4A4A]',
          ].join(' ')}>
            {s.done ? '✓' : i + 1}
          </div>
          <span className={`text-[11px] ${s.done ? 'text-[#C9A84C]' : 'text-[#4A4A4A]'}`}>{s.label}</span>
          {i < 2 && <div className={`w-5 h-px mx-0.5 ${s.done ? 'bg-[#C9A84C]' : 'bg-[#222]'}`} />}
        </div>
      ))}
    </div>
  )
}
