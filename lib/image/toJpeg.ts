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
 * Decode a Blob into something canvas can draw, WITH EXIF orientation
 * baked in. iPhone selfies tag the JPEG with a rotation/mirror EXIF
 * payload — the browser respects it for `<img>` PREVIEW rendering, but a
 * naïve `<img>` → canvas roundtrip drops the transform, so the saved file
 * comes out rotated or mirrored compared to what the customer saw in the
 * camera. `createImageBitmap(blob, { imageOrientation: 'from-image' })`
 * applies the EXIF transform to the BITMAP itself, so drawImage just works.
 *
 * Falls back to `<img>` decode when createImageBitmap isn't available
 * (very old browsers) — those users will see the old behaviour, but they
 * won't be the iPhone-selfie cohort affected by this bug.
 */
async function decodeWithOrientation(source: Blob): Promise<{
  src: CanvasImageSource
  width: number
  height: number
  cleanup: () => void
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
      return {
        src:     bitmap,
        width:   bitmap.width,
        height:  bitmap.height,
        cleanup: () => bitmap.close(),
      }
    } catch (e) {
      // Some browsers throw on the orientation option even when they
      // support createImageBitmap. Fall through to the <img> path so the
      // upload still works (just without EXIF orientation).
      console.warn('[upload] createImageBitmap with from-image failed, falling back:', e)
    }
  }
  const url = URL.createObjectURL(source)
  try {
    const img = await loadImage(url)
    return {
      src:     img,
      width:   img.naturalWidth,
      height:  img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}

/**
 * Convert a user-selected image File into a resized JPEG File.
 *
 * When `mirror: true` is passed, the output is horizontally flipped after
 * decoding. This is what we want for selfies: phone front cameras save the
 * un-mirrored pixel data (so background text reads correctly), but the LIVE
 * preview the customer saw during capture was mirrored — Apple turned
 * "Mirror Front Camera" ON by default in iOS 14, and most users now have
 * the mental model "selfie = mirror view of me". Showing them the un-mirrored
 * file reads as "the photo is flipped, my face looks wrong". Mirroring on
 * upload restores the camera-preview view.
 *
 * Throws {@link UnsupportedImageError} if the browser can't decode it.
 */
export async function fileToJpeg(
  file: File,
  options?: { mirror?: boolean },
): Promise<File> {
  console.log('[upload] BEFORE convert:', { name: file.name, type: file.type || '(empty)', size: file.size, mirror: !!options?.mirror })

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

  // Decode (jpg/png/webp/avif + the heic2any JPEG output) with EXIF
  // orientation honoured, then re-encode JPEG.
  let decoded: Awaited<ReturnType<typeof decodeWithOrientation>>
  try {
    decoded = await decodeWithOrientation(source)
  } catch (e) {
    console.error('[upload] browser could not decode image:', file.type || '(empty)', e)
    throw new UnsupportedImageError()
  }

  const { src: imgSrc, width: srcW, height: srcH, cleanup } = decoded

  try {
    const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH))
    const w = Math.max(1, Math.round(srcW * scale))
    const h = Math.max(1, Math.round(srcH * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new UnsupportedImageError()
    // White backdrop so transparent PNGs/WEBPs don't flatten to black in JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    if (options?.mirror) {
      // Horizontal flip: translate to the right edge, scale -1 on X, then
      // draw at (0,0). The +scale(1,1) is implicit on Y so the image stays
      // upright. ctx is reset by the canvas itself when this function returns,
      // so no save()/restore() needed.
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(imgSrc, 0, 0, w, h)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) throw new UnsupportedImageError()

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    const result = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
    console.log('[upload] AFTER convert :', { name: result.name, type: result.type, size: result.size, dims: `${w}×${h}` })
    return result
  } finally {
    cleanup()
  }
}

