import 'server-only'
import { unstable_cache } from 'next/cache'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { productSpecs, products } from '@/db/schema/products'
import type { Product, Spec } from './types'
import { CATEGORIES, type CategoryDef, type CategoryId } from './categories'

interface ProductRow {
  id: string
  slug: string
  name: string
  categoryId: string
  priceMmk: number
  salePriceMmk: number | null
  tagline: string
  description: string
  swatch: string
  stockQty: number
  lowStockThreshold: number
  hasPhotos: boolean
  isActive: boolean
  featured: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

interface SpecRow {
  productId: string
  label: string
  value: string
  sortOrder: number
}

function rowToProduct(row: ProductRow, specs: readonly Spec[]): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.categoryId as CategoryId,
    price: Number(row.priceMmk),
    salePrice: row.salePriceMmk === null ? null : Number(row.salePriceMmk),
    tagline: row.tagline,
    description: row.description,
    specs,
    swatch: row.swatch,
    inStock: row.stockQty > 0,
    stockQty: row.stockQty,
    lowStockThreshold: row.lowStockThreshold,
    hasPhotos: Boolean(row.hasPhotos),
    featured: row.featured,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function loadAll(): Promise<{ products: Product[] }> {
  const [prodRows, specRows] = await Promise.all([
    db
      .select()
      .from(products)
      .where(eq(products.isActive, true))
      .orderBy(asc(products.sortOrder), asc(products.name)),
    db.select().from(productSpecs).orderBy(asc(productSpecs.productId), asc(productSpecs.sortOrder)),
  ])

  const specsByProduct = new Map<string, Spec[]>()
  for (const s of specRows as SpecRow[]) {
    const list = specsByProduct.get(s.productId) ?? []
    list.push({ label: s.label, value: s.value })
    specsByProduct.set(s.productId, list)
  }

  const productsList = (prodRows as ProductRow[]).map((row) =>
    rowToProduct(row, specsByProduct.get(row.id) ?? []),
  )

  return { products: productsList }
}

const cachedLoadAll = unstable_cache(loadAll, ['catalog-all'], {
  revalidate: 60,
  tags: ['products'],
})

export async function getAllProducts(): Promise<readonly Product[]> {
  const { products } = await cachedLoadAll()
  return products
}

/** Async only so callers do not have to change when this was a table read. */
export async function getAllCategories(): Promise<readonly CategoryDef[]> {
  return CATEGORIES
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await getAllProducts()
  return all.find((p) => p.slug === slug)
}

export async function getCategoryById(id: string): Promise<CategoryDef | undefined> {
  return CATEGORIES.find((c) => c.id === id)
}

export async function getProductsByCategory(id: string): Promise<readonly Product[]> {
  const all = await getAllProducts()
  return all.filter((p) => p.category === id)
}

export async function getFeaturedProducts(): Promise<readonly Product[]> {
  const all = await getAllProducts()
  return all.filter((p) => p.featured)
}

export async function getRelatedProducts(slug: string, limit = 4): Promise<readonly Product[]> {
  const all = await getAllProducts()
  const current = all.find((p) => p.slug === slug)
  if (!current) return []
  return all.filter((p) => p.category === current.category && p.slug !== slug).slice(0, limit)
}
