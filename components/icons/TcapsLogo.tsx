import Image from 'next/image'

// TCAPS brand mark — uses the real artwork at /public/tcaps-logo.png.
// The source file is gold-on-black (not a transparent PNG). On the site's
// near-black surfaces this normally blends in, but in-app browsers (Messenger,
// Zalo, TikTok) render the page slightly lighter and the black square
// becomes visible. `mix-blend-mode: screen` solves that without touching the
// asset: screening black with anything gives back the underlying colour, so
// the black square disappears while the gold logo stays bright. Drop in a
// proper transparent PNG at /tcaps-logo.png to remove the need for this hack.
export function TcapsLogo({ className = '', size = 28 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/tcaps-logo.png"
      alt="TCAPS"
      width={size}
      height={size}
      priority
      style={{ mixBlendMode: 'screen' }}
      className={className}
    />
  )
}
