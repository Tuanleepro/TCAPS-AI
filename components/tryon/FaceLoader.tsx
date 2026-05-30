'use client'

import { useEffect, useState } from 'react'
import type { TryOnStep } from '@/types'

const MESSAGES: Partial<Record<TryOnStep, string[]>> = {
  processing: [
    'Gemini đang đội nón lên đầu bạn…',
    'Dựng phối cảnh & độ vừa vặn…',
    'Render ánh sáng và đổ bóng thật…',
    'Hòa trộn tóc quanh viền nón…',
    'Tinh chỉnh chi tiết nón…',
    'Hoàn thiện ảnh thật…',
  ],
  detecting: [
    'Tải MediaPipe model…',
    'Phát hiện khuôn mặt…',
    'Xác định hình dạng khuôn mặt…',
  ],
}

const STEP_LABELS: Partial<Record<TryOnStep, string>> = {
  processing:   'Gemini AI Active',
  detecting:    'Nhận diện khuôn mặt',
  compositing:  'Đang tạo ảnh ghép',
}

interface Props {
  step: TryOnStep
}

// Expected Gemini round-trip (seconds) for the time-based progress estimate.
const GEMINI_EXPECTED_SEC = 16

export function FaceLoader({ step }: Props) {
  const msgs   = MESSAGES[step] ?? ['Đang xử lý…']
  const [idx, setIdx] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    setIdx(0)
    const t = setInterval(() => setIdx(i => (i + 1) % msgs.length), 1800)
    return () => clearInterval(t)
  }, [step, msgs.length])

  // Time-based progress while Gemini is working (no polling to derive it from).
  const isAPI = step === 'processing'
  useEffect(() => {
    if (!isAPI) { setElapsed(0); return }
    const start = Date.now()
    const t = setInterval(() => setElapsed((Date.now() - start) / 1000), 250)
    return () => clearInterval(t)
  }, [isAPI])

  const progress  = isAPI ? Math.min(95, (elapsed / GEMINI_EXPECTED_SEC) * 100) : null
  const stepLabel = STEP_LABELS[step] ?? 'Đang xử lý'

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16 px-4">

      {/* Animated rings */}
      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full border border-[#C9A84C]/10 animate-spin-slow" />
        <div
          className="absolute inset-2 rounded-full border border-[#C9A84C]/25"
          style={{ animation: 'spinSlow 2.2s linear infinite reverse' }}
        />
        <div className="absolute inset-4 rounded-full border-2 border-t-[#C9A84C] border-r-[#C9A84C]/30 border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-[#C9A84C] pulse-gold" />
        </div>
      </div>

      {/* Visual */}
      <div className="relative w-24 h-28 opacity-65">
        {isAPI ? <AICloudSVG /> : step === 'detecting' ? <FaceMeshSVG /> : <HatPosSVG />}
        {/* Scan line */}
        <div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent"
          style={{ top: '50%', animation: 'scan 2s ease-in-out infinite' }}
        />
      </div>

      {/* Progress bar (API mode only) */}
      {progress !== null && (
        <div className="w-full max-w-xs">
          <div className="h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-[10px] text-[#4A4A4A] mt-1">
            {progress < 95
              ? `${Math.round(progress)}% — khoảng ${Math.max(3, Math.ceil(GEMINI_EXPECTED_SEC - elapsed))}s còn lại`
              : 'Sắp xong…'}
          </p>
        </div>
      )}

      {/* Labels */}
      <div className="text-center space-y-2">
        {isAPI ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.16em] px-3 py-1 rounded-full bg-[#C9A84C]/12 text-[#C9A84C] border border-[#C9A84C]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] pulse-gold" />
            {stepLabel}
          </span>
        ) : (
          <p className="text-[11px] uppercase tracking-[.18em] text-[#C9A84C]">{stepLabel}</p>
        )}
        <p key={idx} className="text-sm text-[#F5F5F5]/50 fade-in-up min-h-[20px]">
          {msgs[idx]}
        </p>
      </div>
    </div>
  )
}

function FaceMeshSVG() {
  const dots: [number, number][] = [[48,12],[24,30],[72,30],[18,46],[78,46],[48,50],[48,86],[10,58],[86,58]]
  return (
    <svg viewBox="0 0 96 100" fill="none" className="w-full h-full">
      <ellipse cx="48" cy="56" rx="36" ry="42" stroke="#C9A84C" strokeWidth=".6" strokeDasharray="4 3">
        <animate attributeName="stroke-dashoffset" values="0;14;0" dur="3s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="30" cy="44" rx="7" ry="4" stroke="#C9A84C" strokeWidth=".6" opacity=".6"/>
      <ellipse cx="66" cy="44" rx="7" ry="4" stroke="#C9A84C" strokeWidth=".6" opacity=".6"/>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.8" fill="#C9A84C">
          <animate attributeName="opacity" values=".2;1;.2" dur={`${1.5+i*.1}s`} repeatCount="indefinite"/>
        </circle>
      ))}
    </svg>
  )
}

function HatPosSVG() {
  return (
    <svg viewBox="0 0 96 100" fill="none" className="w-full h-full">
      <ellipse cx="48" cy="66" rx="32" ry="30" stroke="#C9A84C" strokeWidth=".6" opacity=".4"/>
      <path d="M14 40 Q48 16 82 40 L86 46 Q48 38 10 46 Z" fill="#C9A84C" opacity=".12"/>
      <path d="M14 40 Q48 16 82 40 L86 46 Q48 38 10 46 Z" stroke="#C9A84C" strokeWidth=".8">
        <animate attributeName="opacity" values=".4;1;.4" dur="1.8s" repeatCount="indefinite"/>
      </path>
      <path d="M8 46 Q48 54 88 46" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round">
        <animate attributeName="opacity" values=".5;1;.5" dur="1.8s" repeatCount="indefinite"/>
      </path>
    </svg>
  )
}

function AICloudSVG() {
  return (
    <svg viewBox="0 0 96 100" fill="none" className="w-full h-full">
      {/* Cloud shape */}
      <path
        d="M20 65 Q10 65 10 55 Q10 46 20 44 Q18 35 28 32 Q35 25 46 30 Q54 22 66 28 Q76 28 78 38 Q86 40 86 50 Q86 60 76 62 Z"
        stroke="#C9A84C" strokeWidth=".8" fill="none" opacity=".6"
      >
        <animate attributeName="opacity" values=".3;.7;.3" dur="2s" repeatCount="indefinite"/>
      </path>
      {/* Data flow dots */}
      {[0,1,2,3].map(i => (
        <circle key={i} cx={48} cy={72 - i * 10} r="2" fill="#C9A84C">
          <animate attributeName="opacity" values={`${i*0.2};1;${i*0.2}`} dur={`${1.2+i*.2}s`} repeatCount="indefinite"/>
          <animate attributeName="cy"      values={`${72-i*10};${62-i*10};${72-i*10}`} dur="2s" repeatCount="indefinite"/>
        </circle>
      ))}
      {/* Hat icon */}
      <path d="M32 45 Q48 32 64 45 L66 49 Q48 44 30 49 Z" fill="#C9A84C" opacity=".8">
        <animate attributeName="opacity" values=".4;.9;.4" dur="1.6s" repeatCount="indefinite"/>
      </path>
    </svg>
  )
}
