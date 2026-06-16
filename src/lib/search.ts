import Fuse from 'fuse.js'
import { products } from './products'
import { SEARCH_QUERY_MAX } from './types'
import type { Product } from './types'

const fuse = new Fuse(products as Product[], {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'tagline', weight: 0.2 },
    { name: 'category', weight: 0.15 },
    { name: 'description', weight: 0.1 },
    { name: 'specs.value', weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
})

export function searchProducts(query: string): readonly Product[] {
  const trimmed = query.trim().slice(0, SEARCH_QUERY_MAX)
  if (trimmed.length < 2) return []
  return fuse.search(trimmed).map((r) => r.item)
}
