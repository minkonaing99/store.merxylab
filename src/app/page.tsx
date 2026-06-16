import { Hero } from '@/components/home/hero'
import { Stats } from '@/components/home/stats'
import { ProductGrid } from '@/components/home/product-grid'
import { Why } from '@/components/home/why'
import { CTABanner } from '@/components/home/cta-banner'
import { Newsletter } from '@/components/home/newsletter'
import {
  getAllProducts,
  getFeaturedProducts,
  getProductBySlug,
} from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [featured, all, showcase, ctaProduct] = await Promise.all([
    getFeaturedProducts(),
    getAllProducts(),
    getProductBySlug('mxk-alice-clay'),
    getProductBySlug('mxk-65-walnut'),
  ])

  const gridProducts = [...featured, ...all.filter((p) => !p.featured)].slice(0, 6)

  return (
    <>
      <Hero featured={featured} />
      <Stats />
      <ProductGrid products={gridProducts} />
      <Why showcase={showcase} />
      <CTABanner product={ctaProduct} />
      <Newsletter />
    </>
  )
}
