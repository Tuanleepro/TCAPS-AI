import Image from 'next/image'

// TCAPS brand mark — uses the real artwork at /public/tcaps-logo.png.
// The source file is gold-on-black; the surrounding site is #0A0A0A so the
// black region of the PNG blends into the page background and only the gold
// "t-in-ring" mark reads. If the file ever gains a transparent background,
// no code changes are needed.
export function TcapsLogo({ className = '', size = 28 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/tcaps-logo.png"
      alt="TCAPS"
      width={size}
      height={size}
      priority
      className={className}
    />
  )
}
