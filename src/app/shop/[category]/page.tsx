import { notFound } from 'next/navigation'
import { GridControls } from '@/components/shop/grid-controls'
import { getCategoryById, getProductsByCategory } from '@/lib/catalog'
import type { CategoryId } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const cat = await getCategoryById(category as CategoryId)
  if (!cat) return { title: 'Not found' }
  return {
    title: cat.name,
    description: cat.description,
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const cat = await getCategoryById(category as CategoryId)
  if (!cat) notFound()

  const items = await getProductsByCategory(cat.id)

  return (
    <section className="container-prose py-16 md:py-20">
      <div className="eyebrow">Shop · {cat.name}</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-ink md:text-[56px]">
        {cat.name}.
      </h1>
      <p className="mt-4 max-w-[52ch] text-[15px] text-ink-soft">{cat.description}</p>

      <div className="mt-10">
        <GridControls all={items} activeCategory={cat.id} />
      </div>
    </section>
  )
}
