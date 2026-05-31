import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PRODUCTS, PRODUCT_MAP } from '@/constants/products'
import { Navbar } from '@/components/layout/Navbar'
import { ProductDetail } from './ProductDetail'

// Pre-render every product detail page at build time (SSG). Same set of SKUs
// the catalog renders — drop products without a photo so we don't ship
// placeholder pages.
export function generateStaticParams() {
  return PRODUCTS.filter(p => p.imageUrl).map(p => ({ sku: p.sku }))
}

export function generateMetadata({ params }: { params: { sku: string } }): Metadata {
  const sku = decodeURIComponent(params.sku)
  const product = PRODUCT_MAP[sku]
  if (!product) return { title: 'Sản phẩm không tồn tại — TCAPS' }
  return {
    title:       `${product.name} — TCAPS`,
    description: `${product.name} · 130K/nón · Combo 2 nón 250K · 3 nón 370K · 4 nón 516K tặng 1 · 5 nón 650K tặng 1 · Ship COD toàn quốc · Đổi trả 30 ngày.`,
  }
}

export default function ProductPage({ params }: { params: { sku: string } }) {
  const sku = decodeURIComponent(params.sku)
  const product = PRODUCT_MAP[sku]
  if (!product) notFound()

  return (
    <div className="min-h-dvh bg-[#0A0A0A] text-[#F5F5F5]">
      <Navbar />
      <ProductDetail product={product} />
    </div>
  )
}
