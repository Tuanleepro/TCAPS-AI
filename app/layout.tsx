import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { FloatingContact } from '@/components/layout/FloatingContact'
import './globals.css'

// Body / UI — Inter has full, correct Vietnamese diacritics and reads cleanly.
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

// Display headings — Playfair Display: a luxury high-contrast serif with full
// Vietnamese support (fixes the clipped/broken diacritics the bold Inter caps had).
const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TCAPS — AI Virtual Hat Try-On',
  description: 'Thử nón TCAPS bằng AI. Upload selfie, AI phân tích khuôn mặt và đội nón lên đầu bạn.',
  keywords: ['TCAPS', 'nón thời trang', 'virtual try-on', 'AI', 'streetwear'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0A0A0A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased bg-[#0A0A0A] text-[#F5F5F5]">
        {children}
        <FloatingContact />
      </body>
    </html>
  )
}
