#!/usr/bin/env node
/**
 * scripts/seed.ts
 *
 * Seeds the merxylab-store database from src/data/*.json.
 * JSON `price` field is already MMK whole units (post Phase 5 conversion).
 *
 *   pnpm db:seed
 */
import { config } from 'dotenv'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

config({ path: '.env.local' })
config({ path: '.env', override: false })

import { db } from '../src/db'
import { categories, products, productSpecs } from '../src/db/schema/products'

interface JsonSpec {
  label: string
  value: string
}

interface JsonProduct {
  id: string
  slug: string
  name: string
  category: string
  price: number // MMK whole units
  tagline: string
  description: string
  specs: JsonSpec[]
  swatch: string
  inStock: boolean
  hasPhotos: boolean
  featured?: boolean
  stockQty?: number
  lowStockThreshold?: number
}

interface JsonCategory {
  id: string
  name: string
  description: string
  order: number
}

async function main(): Promise<void> {
  const root = resolve(__dirname, '..')
  const cats = JSON.parse(
    readFileSync(join(root, 'src/data/categories.json'), 'utf8'),
  ) as JsonCategory[]
  const prods = JSON.parse(
    readFileSync(join(root, 'src/data/products.json'), 'utf8'),
  ) as JsonProduct[]

  console.log(`\n  seeding ${cats.length} categories and ${prods.length} products\n`)

  // Wipe (idempotent dev seed)
  await db.delete(productSpecs)
  await db.delete(products)
  await db.delete(categories)

  // Categories
  await db.insert(categories).values(
    cats.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      sortOrder: c.order,
    })),
  )

  // Products
  await db.insert(products).values(
    prods.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      categoryId: p.category,
      priceMmk: p.price,
      tagline: p.tagline,
      description: p.description,
      swatch: p.swatch,
      stockQty: p.stockQty ?? (p.inStock ? 10 : 0),
      lowStockThreshold: p.lowStockThreshold ?? 3,
      hasPhotos: p.hasPhotos,
      isActive: true,
      featured: p.featured ?? false,
    })),
  )

  // Specs
  const specRows = prods.flatMap((p) =>
    p.specs.map((s, i) => ({
      productId: p.id,
      label: s.label,
      value: s.value,
      sortOrder: i,
    })),
  )
  if (specRows.length > 0) {
    await db.insert(productSpecs).values(specRows)
  }

  console.log(`  ✓ ${cats.length} categories`)
  console.log(`  ✓ ${prods.length} products`)
  console.log(`  ✓ ${specRows.length} spec rows`)
  console.log(`  ✓ prices imported as-is (MMK whole units)\n`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
