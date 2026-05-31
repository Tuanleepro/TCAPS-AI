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
    description: `${product.name} · Giá ${product.priceBundle.toLocaleString('vi-VN')}đ · Ship COD toàn quốc · Đổi trả 30 ngày · Mua 2 nón + free ship 250K/2 nón.`,
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
