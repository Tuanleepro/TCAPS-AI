import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Same-origin image proxy for product photos. Mobile in-app browsers
// (Messenger / iOS WebKit) often fail to load cross-origin content.pancake.vn
// images directly (referer/CORS/host quirks). Serving them through our own
// origin makes them load reliably everywhere. Server-side fetch has none of the
// client cross-origin limits.
const ALLOWED_HOSTS = new Set(['content.pancake.vn'])

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('u')
  if (!raw) return new NextResponse('missing u', { status: 400 })

  let url: URL
  try { url = new URL(raw) } catch { return new NextResponse('bad url', { status: 400 }) }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
    return new NextResponse('forbidden host', { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetch(url.toString(), { headers: { accept: 'image/*' } })
  } catch (e) {
    return new NextResponse('fetch failed: ' + (e instanceof Error ? e.message : e), { status: 502 })
  }
  if (!upstream.ok) return new NextResponse('upstream ' + upstream.status, { status: 502 })

  const buf = await upstream.arrayBuffer()
  const contentType = upstream.headers.get('content-type') || 'image/jpeg'
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // product photos are immutable (unique CDN paths) → cache hard
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
