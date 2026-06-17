import 'server-only'
import { unstable_cache } from 'next/cache'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { categories, productSpecs, products } from '@/db/schema/products'
import type { CategoryId, Product, Spec, Category } from './types'

interface ProductRow {
  id: string
  slug: string
  name: string
  categoryId: string
  priceMmk: number
  tagline: string
  description: string
  swatch: string
  stockQty: number
  lowStockThreshold: number
  hasPhotos: boolean
  isActive: boolean
  featured: boolean
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
    tagline: row.tagline,
    description: row.description,
    specs,
    swatch: row.swatch,
    inStock: row.stockQty > 0,
    stockQty: row.stockQty,
    lowStockThreshold: row.lowStockThreshold,
    hasPhotos: Boolean(row.hasPhotos),
    featured: row.featured,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function loadAll(): Promise<{
  products: Product[]
  categories: Category[]
}> {
  const [prodRows, specRows, catRows] = await Promise.all([
    db.select().from(products).where(eq(products.isActive, true)),
    db.select().from(productSpecs).orderBy(asc(productSpecs.productId), asc(productSpecs.sortOrder)),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
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

  const cats: Category[] = catRows.map((c) => ({
    id: c.id as CategoryId,
    name: c.name,
    description: c.description,
    order: c.sortOrder,
  }))

  return { products: productsList, categories: cats }
}

const cachedLoadAll = unstable_cache(loadAll, ['catalog-all'], {
  revalidate: 60,
  tags: ['products', 'categories'],
})

export async function getAllProducts(): Promise<readonly Product[]> {
  const { products } = await cachedLoadAll()
  return products
}

export async function getAllCategories(): Promise<readonly Category[]> {
  const { categories } = await cachedLoadAll()
  return categories
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await getAllProducts()
  return all.find((p) => p.slug === slug)
}

export async function getCategoryById(id: CategoryId): Promise<Category | undefined> {
  const all = await getAllCategories()
  return all.find((c) => c.id === id)
}

export async function getProductsByCategory(id: CategoryId): Promise<readonly Product[]> {
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
