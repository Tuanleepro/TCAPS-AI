// Minimal monochrome inline-SVG icons. All use `stroke="currentColor"` so
// the colour inherits from the parent — gold on highlight buttons, grey on
// subtle labels, red on warnings, etc. Replaces emoji glyphs that looked
// inconsistent across OS / in-app browsers and didn't match the streetwear
// signage aesthetic.

interface IconProps {
  className?: string
  size?:      number
}

const baseProps = (size = 16) => ({
  width:          size,
  height:         size,
  viewBox:        '0 0 16 16',
  fill:           'none',
  stroke:         'currentColor',
  strokeWidth:    1.6,
  strokeLinecap:  'round' as const,
  strokeLinejoin: 'round' as const,
})

export function CartIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className} aria-hidden>
      <path d="M1.5 2h2L5 9.5h7.5L13.8 4H4.5" />
      <circle cx="6.5" cy="12.8" r="1.1" />
      <circle cx="11.8" cy="12.8" r="1.1" />
    </svg>
  )
}

export function SparkleIcon({ className, size }: IconProps) {
  // Four-pointed sparkle with two smaller satellite stars.
  return (
    <svg {...baseProps(size)} className={className} aria-hidden>
      <path d="M8 2l1.3 3.7L13 7l-3.7 1.3L8 12 6.7 8.3 3 7l3.7-1.3z" />
      <path d="M12.5 11.5l.5 1.4L14.4 13l-1.4.5L12.5 15l-.5-1.5L10.6 13l1.4-.1z" />
    </svg>
  )
}

export function GiftIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className} aria-hidden>
      <rect x="1.5" y="6"  width="13" height="3"  rx="0.5" />
      <rect x="2.5" y="9"  width="11" height="5.5" rx="0.5" />
      <path d="M8 6v8.5" />
      <path d="M8 6S6 2.5 4.5 3.5 5.5 6 5.5 6h2.5M8 6s2-3.5 3.5-2.5S10.5 6 10.5 6H8" />
    </svg>
  )
}

export function TruckIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className} aria-hidden>
      <rect x="1" y="4" width="8.5" height="7" rx="0.5" />
      <path d="M9.5 6.5h3.2L15 9v2H9.5z" />
      <circle cx="4" cy="12.5" r="1.3" />
      <circle cx="11.5" cy="12.5" r="1.3" />
    </svg>
  )
}

export function RefreshIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className} aria-hidden>
      <path d="M14 8a6 6 0 0 0-10.5-3.7" />
      <path d="M3.5 1.5v3h3" />
      <path d="M2 8a6 6 0 0 0 10.5 3.7" />
      <path d="M12.5 14.5v-3h-3" />
    </svg>
  )
}

export function ChatIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className} aria-hidden>
      <path d="M2 4.5C2 3.7 2.7 3 3.5 3h9c.8 0 1.5.7 1.5 1.5v5.5c0 .8-.7 1.5-1.5 1.5H7l-3 2.5v-2.5H3.5C2.7 12 2 11.3 2 10.5v-6z" />
    </svg>
  )
}

export function BanIcon({ className, size }: IconProps) {
  return (
    <svg {...baseProps(size)} className={className} aria-hidden>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M3.6 3.6l9 9" />
    </svg>
  )
}

export function CapIcon({ className, size }: IconProps) {
  // Simple snapback silhouette — used as a placeholder when a product has no image.
  return (
    <svg {...baseProps(size)} className={className} aria-hidden>
      <path d="M2 11Q4 4 8 4t6 7" />
      <path d="M2 11h12v1.5H2z" />
    </svg>
  )
}
