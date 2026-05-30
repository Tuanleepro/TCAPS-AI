// Normalise ANY photo a phone might produce into a web-safe JPEG before it
// ever reaches the try-on API / Gemini. Handles:
//   • jpg / jpeg / png / webp / avif → re-encoded via <canvas>
//   • heic / heif (iPhone default)   → decoded with heic2any first
// Output is always image/jpeg, longest side ≤ 2048px, quality 0.92. This is
// what stops "The string did not match the expected pattern." on iOS/Zalo/
// Messenger (HEIC/AVIF data URLs the API + Gemini reject) — everyone gets JPEG.

const MAX_DIM = 2048
const JPEG_QUALITY = 0.92

// Friendly, user-facing failure. Anything we genuinely can't decode lands here
// instead of leaking a cryptic browser/API error.
export class UnsupportedImageError extends Error {
  constructor() {
    super('Định dạng ảnh này chưa được hỗ trợ. Vui lòng chọn ảnh khác.')
    this.name = 'UnsupportedImageError'
  }
}

function isHeic(file: File): boolean {
  const t = file.type.toLowerCase()
  const n = file.name.toLowerCase()
  // iOS often reports an EMPTY type for HEIC, so check the extension too.
  return t === 'image/heic' || t === 'image/heif' || n.endsWith('.heic') || n.endsWith('.heif')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image decode failed'))
    img.src = src
  })
}

/**
 * Convert a user-selected image File into a resized JPEG File.
 * Throws {@link UnsupportedImageError} if the browser can't decode it.
 */
export async function fileToJpeg(file: File): Promise<File> {
  console.log('[upload] BEFORE convert:', { name: file.name, type: file.type || '(empty)', size: file.size })

  let source: Blob = file

  // HEIC/HEIF can't be decoded by <img>/<canvas> on most non-Safari engines
  // (and we want it to work on Android too) → convert with heic2any first.
  if (isHeic(file)) {
    try {
      const heic2any = (await import('heic2any')).default
      const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: JPEG_QUALITY })
      source = Array.isArray(out) ? out[0] : out
    } catch (e) {
      console.error('[upload] heic2any conversion failed:', e)
      throw new UnsupportedImageError()
    }
  }

  // Decode (jpg/png/webp/avif + the heic2any JPEG output), then re-encode JPEG.
  const url = URL.createObjectURL(source)
  let img: HTMLImageElement
  try {
    img = await loadImage(url)
  } catch (e) {
    console.error('[upload] browser could not decode image:', file.type || '(empty)', e)
    throw new UnsupportedImageError()
  } finally {
    URL.revokeObjectURL(url)
  }

  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new UnsupportedImageError()
  // White backdrop so transparent PNGs/WEBPs don't flatten to black in JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new UnsupportedImageError()

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
  const result = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  console.log('[upload] AFTER convert :', { name: result.name, type: result.type, size: result.size, dims: `${w}×${h}` })
  return result
}
