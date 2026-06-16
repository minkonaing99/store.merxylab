import { asc } from 'drizzle-orm'
import { db } from '@/db'
import { products } from '@/db/schema/products'
import { AdminProductTable } from './product-table'

export default async function AdminProductsPage() {
  const rows = await db
    .select()
    .from(products)
    .orderBy(asc(products.categoryId), asc(products.name))

  return (
    <div>
      <h2 className="font-display text-[26px]">Products</h2>
      <p className="mt-2 text-[14px] text-muted">
        Inline edit price, stock, featured, active. Saves on blur.
      </p>
      <AdminProductTable
        initial={rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          categoryId: r.categoryId,
          priceMmk: Number(r.priceMmk),
          stockQty: r.stockQty,
          lowStockThreshold: r.lowStockThreshold,
          featured: r.featured,
          isActive: r.isActive,
          hasPhotos: r.hasPhotos,
        }))}
      />
    </div>
  )
}
