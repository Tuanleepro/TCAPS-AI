// Serve content.pancake.vn product photos through Next.js' built-in image
// optimizer (/_next/image) instead of the raw CDN URL. This does two things
// that mobile in-app browsers (Messenger / iOS WKWebView) need:
//   1. Same-origin — WKWebView often fails to load cross-origin CDN images.
//   2. Resized + re-encoded (WebP) — the raw pancake photos are ~1300px each;
//      rendering ~70 of them full-size at once exhausts the WKWebView memory
//      budget and every image goes blank. Small thumbnails keep memory tiny.
// `width` MUST be one of Next's default image sizes (…,64,96,128,256,384,…).
// Non-pancake / relative URLs pass through unchanged.
export function proxyImg(url?: string | null, width = 384): string {
  if (!url) return ''
  if (!url.startsWith('https://content.pancake.vn/')) return url
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=70`
}
