import productsJson from '@/data/products.json'
import categoriesJson from '@/data/categories.json'
import type { Category, CategoryId, Product } from './types'

export const products: readonly Product[] = productsJson as Product[]
export const categories: readonly Category[] = categoriesJson as Category[]

export function getCategory(id: CategoryId): Category | undefined {
  return categories.find((c) => c.id === id)
}
