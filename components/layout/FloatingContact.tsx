// Floating contact bubbles, bottom-right of every page. One tap → Zalo or
// Messenger chat with the shop. Brand colours match the official apps so the
// affordance is instantly recognisable for Vietnamese users.

'use client'

import { usePathname } from 'next/navigation'

const ZALO_PHONE = '0972284146'                  // 097 228 41 46 → digits only
const MESSENGER_USER_ID = '61557869000489'       // m.me/<id>

export function FloatingContact() {
  // /try-on renders a fixed bottom "Thử Nón Ngay" CTA bar. Lift these chat
  // bubbles above that bar so they're not hidden when the user scrolls.
  const pathname = usePathname()
  const liftForCta = pathname?.startsWith('/try-on')
  const bottomClass = liftForCta ? 'bottom-24' : 'bottom-4'
  return (
    // data-floating-contact lets OrderModal (or any future modal) hide these
    // bubbles via a body[data-modal-open] CSS rule — fixed-position bubbles
    // otherwise composite on top of the modal in some iOS in-app browsers.
    <div
      data-floating-contact=""
      aria-label="Liên hệ TCAPS"
      className={`fixed ${bottomClass} right-4 z-40 flex flex-col gap-2.5 transition-all`}
    >
      <a
        href={`https://zalo.me/${ZALO_PHONE}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat với TCAPS trên Zalo"
        title="Chat Zalo"
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0068FF] text-white shadow-[0_6px_20px_rgba(0,104,255,.45)] hover:bg-[#0084FF] hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <ZaloMark />
      </a>
      <a
        href={`https://m.me/${MESSENGER_USER_ID}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat với TCAPS trên Messenger"
        title="Chat Messenger"
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0084FF] text-white shadow-[0_6px_20px_rgba(0,132,255,.45)] hover:bg-[#0099FF] hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <MessengerMark />
      </a>
    </div>
  )
}

/* The Zalo brand mark is the word "Zalo" in a bold rounded face — most
   recognisable form for VN users, beats a stylised Z. */
function ZaloMark() {
  return (
    <span className="font-black text-[13px] tracking-tight leading-none select-none">
      Zalo
    </span>
  )
}

/* Messenger lightning-bolt-in-bubble silhouette — official affordance. */
function MessengerMark() {
  return (
    <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden="true" className="w-6 h-6">
      <path d="M14 2C7.4 2 2.3 6.95 2.3 13.04c0 3.5 1.74 6.6 4.45 8.62V26l4.07-2.24c1.08.3 2.22.46 3.18.46 6.6 0 11.7-4.95 11.7-11.04S20.6 2 14 2zm1.2 14.86l-3.06-3.27-5.97 3.27 6.57-6.97 3.13 3.27 5.9-3.27-6.57 6.97z" />
    </svg>
  )
}
