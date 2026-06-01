import type { Metadata, Viewport } from 'next'
import { Inter, Bungee } from 'next/font/google'
import { FloatingContact } from '@/components/layout/FloatingContact'
import { CartProvider } from '@/lib/cart/CartContext'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { CheckoutModal } from '@/components/cart/CheckoutModal'
import './globals.css'

// Body / UI — Inter has full, correct Vietnamese diacritics and reads cleanly.
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
})

// Display headings — Bungee: a chunky display face that gives every h1/h2
// the streetwear "stencil signage" feel TCAPS wants. Single weight (400)
// because Bungee only ships one. `vietnamese` subset is required so titles
// like "NÓN MONOGRAM HỌA TIẾT" render with proper accents.
const bungee = Bungee({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight:  '400',
  variable: '--font-display',
  display:  'swap',
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
    <html lang="vi" className={`${inter.variable} ${bungee.variable}`}>
      <body className="antialiased bg-[#0A0A0A] text-[#F5F5F5]">
        <CartProvider>
          {children}
          <FloatingContact />
          <CartDrawer />
          <CheckoutModal />
        </CartProvider>
      </body>
    </html>
  )
}
