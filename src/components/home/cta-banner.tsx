'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Tile } from '../product/tile'
import { getCategory } from '@/lib/products'
import type { Product } from '@/lib/types'

interface CTABannerProps {
  product?: Product
}

/** Headline halves - the second gets the accent treatment. */
type Headline = readonly [lead: string, accent: string]

// Typed non-empty so `HEADLINES[0]` is a safe fallback under
// noUncheckedIndexedAccess.
const HEADLINES: readonly [Headline, ...Headline[]] = [
  ['We keep the quiet ones, so you', 'skip the noise.'],
  ['Tested on our own desk, long', 'before it reaches yours.'],
  ['A short shelf,', 'chosen slowly.'],
  ['Fewer things to pick from,', 'better odds you keep it.'],
]

/** Stable per product, so a given item always carries the same line. */
function headlineFor(id: string): Headline {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return HEADLINES[hash % HEADLINES.length] ?? HEADLINES[0]
}

export function CTABanner({ product }: CTABannerProps) {
  if (!product) return null

  const [lead, accent] = headlineFor(product.id)
  const category = getCategory(product.category)

  return (
    <section className="container-prose py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-dark-bg)] text-[var(--color-dark-ink)]"
      >
        <div className="grid items-center gap-8 p-8 md:grid-cols-[1.2fr_1fr] md:gap-12 md:p-14">
          <div>
            <div className="text-[11px] tracking-[0.14em] uppercase text-cream/55">
              {category?.name ?? 'On the bench'}
            </div>
            <h2 className="mt-3 font-display text-[34px] leading-[1.05] md:text-[48px]">
              {lead}{' '}
              <em className="not-italic [font-variation-settings:'opsz'_144,_'SOFT'_100] text-[var(--color-accent-soft)]">
                {accent}
              </em>
            </h2>
            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-cream/75">
              We try every product before it goes up - feel, sound, finish. The ones that do not earn
              a place on the desk never make the shelf.
            </p>
            <Link
              href={`/product/${product.slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-[var(--color-accent-soft)]"
            >
              Meet the {product.name}
              <ArrowRight size={16} strokeWidth={1.75} />
            </Link>
          </div>

          <div className="relative">
            <div className="mx-auto max-w-[320px] -mr-2 md:mr-0">
              <Tile product={product} ratio="square" showLabel={false} />
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
