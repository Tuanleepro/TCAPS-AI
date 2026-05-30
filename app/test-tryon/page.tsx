'use client'
/**
 * Pipeline Debugger  —  /test-tryon
 * Mode A: Canvas composite (local MediaPipe + compositor, no AI)
 * Mode B: Gemini API (composite → Gemini refine → pixel-lock)
 */

import { useState, useRef } from 'react'
import type { HatAsset } from '@/types'

const HAT_PRESET: HatAsset = {
  id: 'test', name: 'Test Hat', sku: 'TEST',
  style: 'snapback', crownHeight: 'medium', brimCurve: 'flat',
  widthMultiplier: 1.38, offsetYRatio: 0.78,
  overlayUrl: '', imageUrl: '',
}

type Mode = 'canvas' | 'api'

export default function TestTryOnPage() {
  const [mode,       setMode]       = useState<Mode>('api')
  const [faceFile,   setFaceFile]   = useState<File | null>(null)
  const [hatFile,    setHatFile]    = useState<File | null>(null)
  const [faceUrl,    setFaceUrl]    = useState<string | null>(null)
  const [hatUrl,     setHatUrl]     = useState<string | null>(null)
  const [resultUrl,  setResultUrl]  = useState<string | null>(null)
  const [log,        setLog]        = useState<string[]>([])
  const [busy,       setBusy]       = useState(false)

  const abortRef = useRef(false)

  const addLog = (msg: string) => setLog(p => [...p.slice(-60), msg])

  const pick = (type: 'face' | 'hat') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    if (type === 'face') { setFaceFile(f); setFaceUrl(url) }
    else                 { setHatFile(f);  setHatUrl(url) }
    e.target.value = ''
  }

  const stop = () => { abortRef.current = true }

  // ── Canvas mode ────────────────────────────────────────────────────────────
  const runCanvas = async () => {
    if (!faceFile || !hatFile || busy) return
    setBusy(true); abortRef.current = false
    setResultUrl(null); setLog([])

    const _log = console.log; const _warn = console.warn; const _err = console.error
    console.log   = (...a: unknown[]) => { _log(...a);  addLog('  ' + a.map(String).join(' ')) }
    console.warn  = (...a: unknown[]) => { _warn(...a); addLog('⚠ ' + a.map(String).join(' ')) }
    console.error = (...a: unknown[]) => { _err(...a);  addLog('✗ ' + a.map(String).join(' ')) }

    try {
      addLog('▶ Loading MediaPipe…')
      const { detectFace, fileToHTMLImage } = await import('@/lib/mediapipe/faceDetector')
      const { compositeHat }                = await import('@/lib/tryon/hatCompositor')

      addLog('▶ Loading face image…')
      const faceImg = await fileToHTMLImage(faceFile)
      addLog(`✓ Face: ${faceImg.naturalWidth} × ${faceImg.naturalHeight} px`)

      addLog('▶ Running face detection (478 landmarks)…')
      const faceResult = await detectFace(faceImg)

      if (!faceResult.detected) {
        addLog('✗ No face detected — use a clearer selfie with good lighting'); return
      }

      const { pose, headWidthPx, headHeightPx, keyPoints: kp } = faceResult
      addLog(`✓ Face detected`)
      addLog(`  head  : ${headWidthPx|0} × ${headHeightPx|0} px`)
      addLog(`  pose  : roll=${pose.roll.toFixed(1)}°  yaw=${pose.yaw.toFixed(1)}°  pitch=${pose.pitch.toFixed(1)}°`)
      addLog(`  forehead : (${kp.foreheadTop.x|0}, ${kp.foreheadTop.y|0})`)
      addLog(`  temples  : L(${kp.templeLeft.x|0},${kp.templeLeft.y|0})  R(${kp.templeRight.x|0},${kp.templeRight.y|0})`)

      addLog('▶ Compositing hat (scanline warp + hair restoration + shadows)…')
      const out = await compositeHat(faceFile, hatFile, faceResult, HAT_PRESET)
      setResultUrl(out.url)
      addLog(`✓ Done — ${(out.url.length / 1024).toFixed(0)} KB data URL`)
    } catch (err) {
      addLog('✗ ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      console.log = _log; console.warn = _warn; console.error = _err
      setBusy(false)
    }
  }

  // ── Gemini API mode ─────────────────────────────────────────────────────────
  const runAPI = async () => {
    if (!faceFile || !hatFile || busy) return
    setBusy(true); abortRef.current = false
    setResultUrl(null); setLog([])

    const toDataUrl = (f: File) => new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = () => rej(new Error('read fail'))
      r.readAsDataURL(f)
    })

    try {
      // Generative try-on: send selfie + cap straight to Gemini
      addLog('▶ Reading images…')
      const [person, garment] = await Promise.all([toDataUrl(faceFile), toDataUrl(hatFile)])
      addLog(`✓ person ${(person.length / 1024).toFixed(0)} KB · garment ${(garment.length / 1024).toFixed(0)} KB`)

      addLog('▶ Sending selfie + cap to Gemini (generative)…')
      const startRes  = await fetch('/api/tryon', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person, garment }),
      })
      const startData = await startRes.json() as {
        resultUrl?: string; backend?: string; elapsedMs?: number; modelText?: string; error?: string
      }

      if (!startRes.ok || startData.error || !startData.resultUrl) {
        addLog('✗ Gemini failed: ' + (startData.error ?? `HTTP ${startRes.status}`))
        return
      }
      if (abortRef.current) { addLog('⚠ Aborted by user'); return }
      if (startData.modelText) addLog(`  model text: "${startData.modelText}"`)
      setResultUrl(startData.resultUrl)
      addLog(`✓ Done — Gemini render ${startData.elapsedMs}ms`)
    } catch (err) {
      addLog('✗ ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  const run = () => (mode === 'canvas' ? runCanvas() : runAPI())

  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F5F5F5] p-5" style={{ fontFamily: 'monospace' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[#C9A84C] text-sm font-bold uppercase tracking-widest">
          TCAPS · Pipeline Debugger
        </h1>
        <a href="/try-on" className="text-xs text-[#4A4A4A] hover:text-[#C9A84C]">← Try-On UI</a>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-5">
        {(['api', 'canvas'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { if (!busy) setMode(m) }}
            className={[
              'px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
              mode === m
                ? 'bg-[#C9A84C] text-black'
                : 'border border-[#333] text-[#6B6B6B] hover:border-[#C9A84C]/50',
              busy ? 'opacity-40 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {m === 'api' ? 'Replicate (AI Relight)' : 'Canvas Composite (local)'}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-5">
        {(['face', 'hat'] as const).map(type => (
          <label
            key={type}
            className={[
              'cursor-pointer border border-dashed rounded-lg px-4 py-2.5 text-xs uppercase tracking-widest transition-colors',
              type === 'face'
                ? (faceFile ? 'border-[#C9A84C] text-[#C9A84C]' : 'border-[#333] text-[#6B6B6B] hover:border-[#C9A84C]/50')
                : (hatFile  ? 'border-[#C9A84C] text-[#C9A84C]' : 'border-[#333] text-[#6B6B6B] hover:border-[#C9A84C]/50'),
            ].join(' ')}
          >
            {type === 'face'
              ? (faceFile ? `✓ ${faceFile.name.slice(0, 20)}` : 'Upload Selfie')
              : (hatFile  ? `✓ ${hatFile.name.slice(0, 20)}`  : 'Upload Hat PNG')}
            <input
              type="file"
              accept={type === 'hat' ? 'image/png' : 'image/jpeg,image/jpg,image/png,image/webp'}
              onChange={pick(type)}
              className="sr-only"
            />
          </label>
        ))}

        <button
          onClick={run}
          disabled={!faceFile || !hatFile || busy}
          className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#C9A84C] hover:bg-[#E8C96A] text-black"
        >
          {busy ? 'Processing…' : 'Run Pipeline'}
        </button>

        {busy && (
          <button
            onClick={stop}
            className="px-4 py-2.5 rounded-lg text-xs border border-[#E05252] text-[#E05252] hover:bg-[#E05252]/10"
          >
            Stop
          </button>
        )}

        {resultUrl && !resultUrl.startsWith('data:') && (
          <a
            href={resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-lg text-xs border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10"
          >
            ↗ Open Result
          </a>
        )}
        {resultUrl && resultUrl.startsWith('data:') && (
          <a
            href={resultUrl}
            download={`tcaps-debug-${Date.now()}.jpg`}
            className="px-4 py-2.5 rounded-lg text-xs border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10"
          >
            ↓ Download
          </a>
        )}
      </div>

      {/* Gemini status (API mode while busy) */}
      {mode === 'api' && busy && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/8 flex items-center gap-2 text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
          <span className="text-[#C9A84C] font-bold uppercase tracking-widest">Gemini AI Active</span>
        </div>
      )}

      {/* Image panels */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'SELFIE INPUT', src: faceUrl,   checker: false },
          { label: 'HAT PNG',      src: hatUrl,    checker: true  },
          { label: 'RESULT',       src: resultUrl, checker: false },
        ].map(({ label, src, checker }) => (
          <div key={label}>
            <p className="text-[10px] text-[#C9A84C] tracking-[.2em] mb-1.5">{label}</p>
            <div
              className="rounded-xl border border-[#1A1A1A] overflow-hidden"
              style={{
                aspectRatio: '3/4',
                background: checker
                  ? 'repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%) 0 0/16px 16px'
                  : '#0D0D0D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {src
                ? <img src={src} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                : <span className="text-[#222] text-xs">{busy && label === 'RESULT' ? '⏳' : '—'}</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Console output */}
      <div className="rounded-xl border border-[#1A1A1A] bg-[#0D0D0D] p-4 max-h-72 overflow-y-auto">
        <p className="text-[10px] text-[#C9A84C] tracking-[.2em] mb-2">CONSOLE</p>
        {log.length === 0
          ? <p className="text-xs text-[#333]">Upload selfie + hat PNG → Run Pipeline</p>
          : log.map((line, i) => (
              <p
                key={i}
                className={[
                  'text-xs leading-5 whitespace-pre-wrap break-all',
                  line.startsWith('✗') ? 'text-[#E05252]'
                  : line.startsWith('✓') ? 'text-[#6FBF8E]'
                  : line.startsWith('▶') ? 'text-[#C9A84C]'
                  : line.startsWith('⚠') ? 'text-[#D4A44C]'
                  : 'text-[#6B6B6B]',
                ].join(' ')}
              >
                {line}
              </p>
            ))
        }
        {busy && (
          <p className="text-xs text-[#C9A84C] animate-pulse mt-1">
            {mode === 'api' ? 'Gemini đang xử lý…' : 'Processing…'}
          </p>
        )}
      </div>

      {/* Mode info / calibration hint */}
      <div className="mt-4 p-3 rounded-lg border border-[#1A1A1A] text-[10px] text-[#4A4A4A]">
        {mode === 'api' ? (
          <>
            <span className="text-[#C9A84C]">GEMINI API</span>
            {'  '}model: <span className="text-[#F5F5F5]">gemini-2.5-flash-image</span>
            {'  '}pipeline: <span className="text-[#F5F5F5]">composite → refine → pixel-lock</span>
            <br/>
            Gemini only harmonizes the seam/shadow band; the hat pixels are locked to the composite. Needs <span className="text-[#F5F5F5]">GEMINI_API_KEY</span> in .env.local.
          </>
        ) : (
          <>
            <span className="text-[#C9A84C]">CANVAS PRESET</span>
            {'  '}widthMultiplier=<span className="text-[#F5F5F5]">{HAT_PRESET.widthMultiplier}</span>
            {'  '}offsetYRatio=<span className="text-[#F5F5F5]">{HAT_PRESET.offsetYRatio}</span>
            {'  '}style=<span className="text-[#F5F5F5]">{HAT_PRESET.style}</span>
            <br/>
            Adjust values in <span className="text-[#F5F5F5]">HAT_PRESET</span> (line 12 of this file) if hat floats or sits too low.
          </>
        )}
      </div>
    </div>
  )
}
