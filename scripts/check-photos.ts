#!/usr/bin/env node
/**
 * scripts/check-photos.ts
 *
 * Scans public/products/{slug}/ for product photos and updates
 * src/data/products.json so each product's hasPhotos flag reflects
 * whether at least the hero shot (01.webp) exists on disk.
 *
 * Slot convention: 01.webp (hero) is required for hasPhotos=true.
 * Additional slots (02-04.webp) are optional and discovered at render time.
 *
 * Usage:
 *   pnpm photos:check
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(__dirname, '..')
const PRODUCTS_JSON = join(ROOT, 'src/data/products.json')
const PHOTOS_DIR = join(ROOT, 'public/products')
const HERO_SLOT = '01.webp'
const ALL_SLOTS = ['01.webp', '02.webp', '03.webp', '04.webp'] as const

interface Product {
  slug: string
  name: string
  hasPhotos?: boolean
  [k: string]: unknown
}

interface SlugReport {
  slug: string
  name: string
  before: boolean
  after: boolean
  slotsFound: number
  extras: string[]
}

function readProducts(): Product[] {
  const raw = readFileSync(PRODUCTS_JSON, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) throw new Error('products.json is not an array')
  return parsed as Product[]
}

function writeProducts(products: Product[]): void {
  writeFileSync(PRODUCTS_JSON, JSON.stringify(products, null, 2) + '\n')
}

function scanSlug(slug: string): { hasHero: boolean; slotsFound: number; extras: string[] } {
  const dir = join(PHOTOS_DIR, slug)
  if (!existsSync(dir)) {
    return { hasHero: false, slotsFound: 0, extras: [] }
  }
  const files = new Set(readdirSync(dir))
  const slotsFound = ALL_SLOTS.filter((s) => files.has(s)).length
  const extras = [...files].filter(
    (f) => !ALL_SLOTS.includes(f as (typeof ALL_SLOTS)[number]) && !f.startsWith('.'),
  )
  return { hasHero: files.has(HERO_SLOT), slotsFound, extras }
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

function main(): void {
  const products = readProducts()
  const reports: SlugReport[] = []
  let changed = 0

  for (const p of products) {
    const before = Boolean(p.hasPhotos)
    const scan = scanSlug(p.slug)
    const after = scan.hasHero
    if (before !== after) {
      p.hasPhotos = after
      changed++
    }
    reports.push({
      slug: p.slug,
      name: typeof p.name === 'string' ? p.name : p.slug,
      before,
      after,
      slotsFound: scan.slotsFound,
      extras: scan.extras,
    })
  }

  if (changed > 0) {
    writeProducts(products)
  }

  // Summary table
  const withPhotos = reports.filter((r) => r.after).length
  const total = reports.length

  console.log('\n  merxylab photo check')
  console.log(`  ${withPhotos}/${total} products have photos (hero slot present)\n`)

  const rows = reports
    .filter((r) => r.before !== r.after || r.slotsFound > 0 || r.extras.length > 0)
    .sort((a, b) => a.slug.localeCompare(b.slug))

  if (rows.length > 0) {
    console.log(
      '  ' +
        pad('slug', 22) +
        pad('photos', 10) +
        pad('slots', 8) +
        pad('flag', 14) +
        'notes',
    )
    console.log('  ' + '─'.repeat(72))
    for (const r of rows) {
      const flag = r.before === r.after ? pad(`${r.after}`, 14) : pad(`${r.before} → ${r.after}`, 14)
      const notes = r.extras.length > 0 ? `extras: ${r.extras.join(', ')}` : ''
      console.log(
        '  ' +
          pad(r.slug, 22) +
          pad(r.after ? 'yes' : 'no', 10) +
          pad(`${r.slotsFound}/4`, 8) +
          flag +
          notes,
      )
    }
    console.log('')
  }

  console.log(
    changed > 0
      ? `  wrote ${changed} flag change${changed === 1 ? '' : 's'} to products.json\n`
      : '  no flag changes\n',
  )
}

main()
