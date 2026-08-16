import { Hero } from '@/components/home/hero'
import { Stats } from '@/components/home/stats'
import { ProductGrid } from '@/components/home/product-grid'
import { Why } from '@/components/home/why'
import { CTABanner } from '@/components/home/cta-banner'
import { getAllProducts, getFeaturedProducts } from '@/lib/catalog'
import { getSetting } from '@/lib/site-settings'
import { r2PublicUrl } from '@/lib/r2'
import type { Product } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * A different featured product each visit. Previously both spots pinned a
 * hardcoded slug, so deactivating that product made the section vanish.
 */
function pickRotating(pool: readonly Product[], exclude?: Product): Product | undefined {
  const candidates = exclude ? pool.filter((p) => p.id !== exclude.id) : pool
  const from = candidates.length > 0 ? candidates : pool
  return from[Math.floor(Math.random() * from.length)]
}

/**
 * Promo surfaces only advertise what a customer can actually buy today.
 * `getAllProducts` already drops inactive rows; this drops sold-out ones, so
 * setting stock to 0 in admin pulls a product out of the hero and banners
 * without deactivating it or breaking its product page.
 */
function sellable(products: readonly Product[]): readonly Product[] {
  return products.filter((p) => p.inStock)
}

export default async function HomePage() {
  const [featured, all, whyImageKey] = await Promise.all([
    getFeaturedProducts(),
    getAllProducts(),
    getSetting('why_image'),
  ])

  const inStockFeatured = sellable(featured)
  const inStockAll = sellable(all)
  // Prefer featured + in stock; widen only if that leaves nothing to show.
  const pool =
    inStockFeatured.length > 0 ? inStockFeatured : inStockAll.length > 0 ? inStockAll : all
  const ctaProduct = pickRotating(pool)
  const showcase = pickRotating(pool, ctaProduct)

  const gridProducts = [...featured, ...all.filter((p) => !p.featured)].slice(0, 6)
  const whyImageUrl = whyImageKey ? r2PublicUrl(whyImageKey) : null

  return (
    <div className="flex h-full flex-col">
      <Hero featured={inStockFeatured.length > 0 ? inStockFeatured : featured} />
      <Stats />
      <ProductGrid products={gridProducts} />
      <Why showcase={showcase} imageUrl={whyImageUrl} />
      <CTABanner product={ctaProduct} />
    </div>
  )
}
