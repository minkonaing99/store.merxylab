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
import { getSetting } from '@/lib/site-settings'
import { r2PublicUrl } from '@/lib/r2'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [featured, all, showcase, ctaProduct, whyImageKey] = await Promise.all([
    getFeaturedProducts(),
    getAllProducts(),
    getProductBySlug('mxk-alice-clay'),
    getProductBySlug('mxk-65-walnut'),
    getSetting('why_image'),
  ])

  const gridProducts = [...featured, ...all.filter((p) => !p.featured)].slice(0, 6)
  const whyImageUrl = whyImageKey ? r2PublicUrl(whyImageKey) : null

  return (
    <>
      <Hero featured={featured} />
      <Stats />
      <ProductGrid products={gridProducts} />
      <Why showcase={showcase} imageUrl={whyImageUrl} />
      <CTABanner product={ctaProduct} />
      <Newsletter />
    </>
  )
}
