'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getCategory } from '@/lib/products'
import { PHOTO_BASE, type Product } from '@/lib/types'

const FLIGHT = { duration: 0.5, ease: [0.16, 1, 0.3, 1] } as const

// 1x1 transparent GIF - keeps the single hero <Image> mounted (stable identity,
// no stacking) when the active product has no photo.
const TRANSPARENT_PX =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

interface HeroProps {
  featured: readonly Product[]
}

export function Hero({ featured }: HeroProps) {
  const [active, setActive] = useState(0)
  const items = featured.slice(0, 4)
  const hero = items[0]
  if (!hero) return null
  const current = items[active] ?? hero

  return (
    <section className="container-prose pt-10 pb-14 md:pt-16 md:pb-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-14"
      >
        <div>
          <div className="eyebrow">Edition 01 - quiet desk</div>
          <h1 className="mt-4 font-display text-[44px] leading-[1.05] tracking-[-0.015em] text-ink md:text-[68px] md:leading-[1.02]">
            Tools for the{' '}
            <span
              className="mx-1 inline-block h-[0.72em] w-[1.4em] translate-y-[0.08em] rounded-[12px] align-baseline ring-1 ring-inset ring-ink/10 shadow-[var(--shadow-sm)]"
              style={{ background: current.swatch }}
              aria-hidden
            />{' '}
            desk you actually{' '}
            <em className="not-italic [font-variation-settings:'opsz'_144,_'SOFT'_100] text-accent">
              use.
            </em>
          </h1>
          <p className="mt-5 max-w-[42ch] text-[16px] leading-relaxed text-ink-soft md:text-[17px]">
            Keyboards, mice, headsets, mics, speakers, and accessories - built quietly, made to
            last. No hype. Just hardware that earns its place on your desk.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
            >
              Visit the shop
              <ArrowRight size={16} strokeWidth={1.75} />
            </Link>
            <Link
              href={`/product/${current.slug}`}
              className="inline-flex items-center gap-2 text-[14px] font-medium text-ink underline underline-offset-[6px] decoration-[1.5px] hover:text-accent"
            >
              See the {current.name}
            </Link>
          </div>
        </div>

        <Showcase items={items} active={active} onSelect={setActive} />
      </motion.div>
    </section>
  )
}

interface ShowcaseProps {
  items: readonly Product[]
  active: number
  onSelect: (i: number) => void
}

function Showcase({ items, active, onSelect }: ShowcaseProps) {
  const reduce = useReducedMotion()
  const current = items[active]
  if (!current) return null
  const lid = (id: string) => (reduce ? undefined : `hero-${id}`)

  return (
    <LayoutGroup id="hero">
      <div>
        <div
          className="relative aspect-square overflow-hidden rounded-[var(--radius)]"
          style={{ background: current.swatch }}
        >
          {/* Flight: only a solid swatch morphs between thumb and big - no image,
              so Framer's layout projection never strands a loading <Image>. */}
          <motion.div
            layout={!reduce}
            layoutId={lid(current.id)}
            transition={FLIGHT}
            className="absolute inset-0"
            style={{ background: current.swatch }}
          />
          {/* One persistent <Image> whose src tracks the active product. No key,
              so React reuses the single <img> and just swaps src - there is only
              ever one element, which makes photo stacking impossible. The swatch
              flight behind covers the swap. When the active product has no photo,
              src falls back to a 1x1 transparent pixel so the element stays mounted
              (stable identity) but shows nothing. */}
          <Image
            src={
              current.hasPhotos
                ? `${PHOTO_BASE}/${current.slug}/01.webp`
                : TRANSPARENT_PX
            }
            alt={current.hasPhotos ? current.name : ''}
            fill
            sizes="(min-width: 768px) 50vw, 90vw"
            priority
            unoptimized={!current.hasPhotos}
            className="object-cover"
          />
          <Label key={current.id} product={current} />
        </div>

        {items.length > 1 && (
          <div className="mt-4 flex gap-3 md:mt-5 md:gap-3.5">
            {items.map((p, i) =>
              i === active ? (
                <CarvedSocket key={p.id} swatch={p.swatch} />
              ) : (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={`Show ${p.name}`}
                  className={cn(
                    'relative size-14 shrink-0 overflow-hidden rounded-[10px] md:size-16',
                    'shadow-[var(--shadow-sm)] ring-1 ring-ink/5 transition',
                    'duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]',
                  )}
                  style={{ background: p.swatch }}
                >
                  <motion.div
                    layout={!reduce}
                    layoutId={lid(p.id)}
                    transition={FLIGHT}
                    className="absolute inset-0"
                    style={{ background: p.swatch }}
                  />
                  {p.hasPhotos && (
                    <Image
                      src={`${PHOTO_BASE}/${p.slug}/01-thumb.webp`}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </LayoutGroup>
  )
}

// Static overlay on the big square; fades per product. Not part of the flight.
function Label({ product }: { product: Product }) {
  if (product.hasPhotos) return null
  const dark = isDark(product.swatch)
  const ink = dark ? '#F5EFE6' : '#1C1B19'
  const muted = dark ? 'rgba(245,239,230,0.6)' : 'rgba(28,27,25,0.5)'
  const category = getCategory(product.category)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="pointer-events-none absolute inset-0"
    >
      <div
        className="absolute top-4 left-4 text-[10px] font-medium tracking-[0.12em] uppercase"
        style={{ color: muted }}
      >
        {category?.name ?? product.category}
      </div>
      <div
        className="absolute right-4 bottom-4 left-4 text-[15px] leading-tight font-semibold"
        style={{ color: ink }}
      >
        {product.name}
      </div>
    </motion.div>
  )
}

function CarvedSocket({ swatch }: { swatch: string }) {
  return (
    <div
      aria-current="true"
      aria-label="Current item"
      className="relative size-14 shrink-0 rounded-[10px] md:size-16"
      style={{
        background: swatch,
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.12)',
      }}
    >
      <div
        className="absolute inset-0 rounded-[10px]"
        style={{ background: 'rgba(0,0,0,0.28)' }}
        aria-hidden
      />
    </div>
  )
}

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 < 140
}
