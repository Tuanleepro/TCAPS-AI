'use client'

import { useCallback, useRef, useState } from 'react'
import { fileToJpeg, UnsupportedImageError } from '@/lib/image/toJpeg'

type ZoneType = 'face' | 'hat'

interface Props {
  type:       ZoneType
  file:       File | null
  previewUrl: string | null
  onFile:     (f: File) => void
  disabled?:  boolean
  loading?:   boolean
}

// Face: accept EVERYTHING the phone camera roll offers (incl. HEIC/HEIF/AVIF) —
// we convert to JPEG client-side before use. Hat: transparent PNG only.
const ACCEPT = { face: 'image/*', hat: 'image/png' }
const MAX_BYTES = 30 * 1024 * 1024   // HEIC/RAW phone photos can be large pre-convert

function validate(f: File, type: ZoneType): string | null {
  if (f.size > MAX_BYTES) return 'File quá lớn — tối đa 30MB'
  if (type === 'hat') {
    if (f.type !== 'image/png') return 'Nón phải là PNG nền trong suốt'
    return null
  }
  // Face: iOS often reports an EMPTY mime type for HEIC, so allow empty too;
  // anything truly un-decodable is caught later with a friendly message.
  if (f.type && !f.type.startsWith('image/')) return 'Chỉ chấp nhận file ảnh'
  return null
}

export function UploadZone({ type, file, previewUrl, onFile, disabled, loading }: Props) {
  const [dragging,   setDragging]   = useState(false)
  const [err,        setErr]        = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const inputRef                    = useRef<HTMLInputElement>(null)

  const handle = useCallback(async (f: File) => {
    const e = validate(f, type)
    if (e) { setErr(e); return }
    setErr(null)

    // Hat keeps its raw PNG. Face photos are normalised to JPEG (HEIC/HEIF via
    // heic2any, AVIF/PNG/WEBP via canvas) so iPhone/Android/Zalo/Messenger all
    // upload successfully and Gemini always receives image/jpeg.
    if (type !== 'face') { onFile(f); return }

    setConverting(true)
    try {
      // Mirror face uploads — phone front cameras save UN-mirrored pixels but
      // the live preview the customer just saw was MIRRORED (iOS 14+ default).
      // Flipping on upload restores the camera-preview view they expected; the
      // try-on AI receives the mirrored image so the output also matches.
      onFile(await fileToJpeg(f, { mirror: true }))
    } catch (err2) {
      setErr(err2 instanceof UnsupportedImageError
        ? err2.message
        : 'Định dạng ảnh này chưa được hỗ trợ. Vui lòng chọn ảnh khác.')
    } finally {
      setConverting(false)
    }
  }, [type, onFile])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handle(f)
  }

  const isHat = type === 'hat'
  const label = isHat ? 'Ảnh nón PNG' : 'Ảnh selfie'
  const hint  = isHat
    ? 'PNG nền trong suốt · tối đa 15MB'
    : '*Lưu ý sử dụng ảnh rõ mặt'

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[.15em] text-[#C9A84C]">
          {label}
        </span>
        {file && (
          <span className="text-[10px] text-[#6B6B6B] truncate max-w-[160px]">{file.name}</span>
        )}
      </div>

      {/* Drop area */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Upload ${label}`}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        aria-busy={loading || undefined}
        className={[
          'relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden',
          'min-h-[180px] flex items-center justify-center cursor-pointer',
          dragging
            ? 'drop-active'
            : previewUrl
              ? 'border-[#222] bg-[#111]'
              : 'border-[#222] bg-[#0D0D0D] hover:border-[#C9A84C]/40 hover:bg-[#C9A84C]/3',
          disabled ? 'opacity-40 pointer-events-none' : '',
        ].join(' ')}
      >
        {previewUrl ? (
          <>
            {isHat && <div className="absolute inset-0 checker-bg" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={label}
              loading="lazy"
              className="relative z-10 max-h-[220px] w-full object-contain p-3 select-none"
              draggable={false}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 z-20 flex items-end justify-center pb-4 bg-gradient-to-t from-black/60 via-transparent opacity-0 hover:opacity-100 transition-opacity duration-200">
              <span className="text-xs text-white bg-black/50 px-3 py-1 rounded-full">
                Đổi ảnh
              </span>
            </div>
          </>
        ) : (
          <EmptyState type={type} dragging={dragging} hint={hint} />
        )}

        {(loading || converting) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0A0A0A]/75 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#2A2A2A" strokeWidth="3" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="#C9A84C" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span className="text-[11px] text-[#C9A84C]">
                {converting ? 'Đang xử lý ảnh…' : 'Đang tải nón…'}
              </span>
            </div>
          </div>
        )}
      </div>

      {err && (
        <p className="text-[11px] text-[#E05252] flex items-center gap-1">
          <span>⚠</span>{err}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[type]}
        className="sr-only"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = '' }}
        disabled={disabled}
      />
    </div>
  )
}

function EmptyState({ type, dragging, hint }: { type: ZoneType; dragging: boolean; hint: string }) {
  const gold = dragging ? '#C9A84C' : '#4A4A4A'
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 pointer-events-none select-none text-center">
      {type === 'face' ? <FaceIcon color={gold} /> : <HatIcon color={gold} />}
      <div>
        <p className={`text-sm font-medium transition-colors ${dragging ? 'text-[#C9A84C]' : 'text-[#F5F5F5]/70'}`}>
          {dragging ? 'Thả ảnh vào đây' : 'Kéo thả hoặc click để chọn'}
        </p>
        <p className="text-[13px] text-[#6B6B6B] mt-1">{hint}</p>
      </div>
    </div>
  )
}

function FaceIcon({ color }: { color: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="22" cy="16" r="9" stroke={color} strokeWidth="1.5" />
      <path d="M4 40c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* sparkle hint */}
      <line x1="22" y1="2" x2="22" y2="5" stroke={color} strokeWidth="1" strokeLinecap="round" opacity=".5" />
      <line x1="36" y1="16" x2="39" y2="16" stroke={color} strokeWidth="1" strokeLinecap="round" opacity=".5" />
      <line x1="5" y1="16" x2="8" y2="16" stroke={color} strokeWidth="1" strokeLinecap="round" opacity=".5" />
    </svg>
  )
}

function HatIcon({ color }: { color: string }) {
  return (
    <svg width="52" height="36" viewBox="0 0 52 36" fill="none">
      <path d="M6 26 Q26 6 46 26 L49 30 Q26 22 3 30 Z" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="2" y="29" width="48" height="5" rx="2.5" stroke={color} strokeWidth="1.5" fill="none" />
      <path d="M26 6 V14" stroke={color} strokeWidth="1" strokeLinecap="round" opacity=".4" />
    </svg>
  )
}
