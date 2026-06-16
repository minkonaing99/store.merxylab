import { GridControls } from '@/components/shop/grid-controls'
import { getAllProducts } from '@/lib/catalog'

export const metadata = {
  title: 'Shop',
  description:
    'Every peripheral on the bench. Keyboards, mice, headsets, mics, speakers, accessories.',
}

export default async function ShopPage() {
  const products = await getAllProducts()

  return (
    <section className="container-prose py-16 md:py-20">
      <div className="eyebrow">Shop</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-ink md:text-[56px]">
        Every peripheral on the bench.
      </h1>
      <p className="mt-4 max-w-[52ch] text-[15px] text-ink-soft">
        Sorted by what we like best this week. Filter by category to narrow it down.
      </p>

      <div className="mt-10">
        <GridControls all={products} />
      </div>
    </section>
  )
}
