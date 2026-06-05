'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

const SKUS = ['SOI-TRANG-DV','SOI-DEN-DV','SOI-TRANG','SOI-DEN','GCL2-BAC','GCL2-DEN','GCD-TRANG','GCD-DEN','GCD-GOLD']

export default function AdminPage() {
  const [sku, setSku]         = useState(SKUS[0])
  const [imgFile, setImgFile] = useState<File|null>(null)
  const [pngFile, setPngFile] = useState<File|null>(null)
  const [imgPrev, setImgPrev] = useState<string|null>(null)
  const [pngPrev, setPngPrev] = useState<string|null>(null)
  const [saved,   setSaved]   = useState(false)

  const imgRef = useRef<HTMLInputElement>(null)
  const pngRef = useRef<HTMLInputElement>(null)

  const pick = (f: File, type: 'img'|'png') => {
    const url = URL.createObjectURL(f)
    if (type==='img') { setImgFile(f); setImgPrev(url) }
    else              { setPngFile(f); setPngPrev(url) }
  }

  const handleSave = () => {
    if (!imgFile || !pngFile) return
    // In production: POST to /api/admin/hats with FormData
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F5F5F5]">
      <header className="border-b border-[#161616] bg-[#0D0D0D]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-widest shimmer">TCAPS</Link>
          <div className="flex items-center gap-3">
            <Link href="/admin/usage" className="text-[11px] font-bold uppercase tracking-wider text-[#C9A84C] hover:text-[#E8C96A] border border-[#C9A84C]/40 hover:border-[#C9A84C] rounded px-2.5 py-1 transition-colors">
              📊 Usage
            </Link>
            <span className="text-xs text-[#6B6B6B] border border-[#2A2A2A] px-2 py-0.5 rounded">Admin</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-8">
        <div>
          <p className="text-[11px] uppercase tracking-[.18em] text-[#C9A84C] mb-1">Admin Panel</p>
          <h1 className="text-2xl font-black">Upload Hat Assets</h1>
          <p className="text-sm text-[#6B6B6B] mt-1">Thêm ảnh sản phẩm và overlay PNG cho try-on</p>
        </div>

        <div className="flex flex-col gap-6">
          {/* SKU selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-[.15em] text-[#C9A84C] mb-2">SKU</label>
            <select
              value={sku}
              onChange={e => setSku(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-[#111] border border-[#222] text-[#F5F5F5] text-sm focus:border-[#C9A84C] outline-none"
            >
              {SKUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Product image */}
          <UploadField
            label="Ảnh sản phẩm (JPG/PNG)"
            hint="Product photo — displayed in catalog"
            preview={imgPrev}
            transparent={false}
            accept="image/jpeg,image/png"
            inputRef={imgRef}
            onFile={f => pick(f,'img')}
          />

          {/* Overlay PNG */}
          <UploadField
            label="Overlay PNG (nền trong suốt)"
            hint="Transparent PNG — used for try-on overlay"
            preview={pngPrev}
            transparent={true}
            accept="image/png"
            inputRef={pngRef}
            onFile={f => pick(f,'png')}
          />

          {/* Calibration */}
          <div className="p-4 rounded-xl border border-[#1A1A1A] bg-[#0D0D0D]">
            <p className="text-xs font-semibold text-[#F5F5F5] mb-3">Calibration (tuning)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-[#6B6B6B] mb-1 block">Width Multiplier (1.1–1.6)</label>
                <input type="number" defaultValue={1.38} step={0.02} min={1.0} max={2.0}
                  className="w-full h-9 px-3 rounded-lg bg-[#111] border border-[#222] text-sm text-[#F5F5F5] focus:border-[#C9A84C] outline-none"/>
              </div>
              <div>
                <label className="text-[10px] text-[#6B6B6B] mb-1 block">Y Offset Ratio (0.5–1.0)</label>
                <input type="number" defaultValue={0.78} step={0.02} min={0.3} max={1.2}
                  className="w-full h-9 px-3 rounded-lg bg-[#111] border border-[#222] text-sm text-[#F5F5F5] focus:border-[#C9A84C] outline-none"/>
              </div>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!imgFile || !pngFile}
            className={[
              'h-12 rounded-xl font-bold text-sm transition-all duration-200',
              imgFile && pngFile
                ? 'bg-[#C9A84C] hover:bg-[#E8C96A] text-black shadow-[0_0_20px_rgba(201,168,76,.3)]'
                : 'bg-[#1A1A1A] text-[#4A4A4A] cursor-not-allowed',
            ].join(' ')}
          >
            {saved ? '✓ Đã lưu!' : 'Lưu vào Supabase + Cloudinary'}
          </button>
        </div>
      </main>
    </div>
  )
}

function UploadField({
  label, hint, preview, transparent, accept, inputRef, onFile
}: {
  label: string; hint: string; preview: string|null; transparent: boolean
  accept: string; inputRef: React.MutableRefObject<HTMLInputElement|null>; onFile: (f: File)=>void
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[.15em] text-[#C9A84C] mb-2">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className="rounded-xl border border-dashed border-[#222] hover:border-[#C9A84C]/50 cursor-pointer overflow-hidden min-h-[140px] flex items-center justify-center bg-[#0D0D0D] transition-all duration-200"
      >
        {preview ? (
          <div className={`w-full ${transparent ? 'checker-bg' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="max-h-[180px] w-full object-contain p-3"/>
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-[#4A4A4A]">Click để chọn file</p>
            <p className="text-xs text-[#2A2A2A] mt-1">{hint}</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="sr-only"
        onChange={e => { const f=e.target.files?.[0]; if(f) onFile(f); e.target.value='' }}/>
    </div>
  )
}
