'use client'

import Link from 'next/link'
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Tile } from '../product/tile'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

const FLIGHT = { type: 'spring', stiffness: 380, damping: 34, mass: 0.7 } as const

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
        <div className="relative aspect-square">
          <motion.div
            key={current.id}
            layout={!reduce}
            layoutId={lid(current.id)}
            initial={reduce ? { opacity: 0.55 } : false}
            animate={reduce ? { opacity: 1 } : undefined}
            transition={reduce ? { duration: 0.3 } : FLIGHT}
            className="absolute inset-0"
          >
            <Tile product={current} ratio="square" priority useThumb={false} />
          </motion.div>
        </div>

        {items.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-3 md:mt-4 md:gap-4">
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
                    'relative aspect-square overflow-hidden rounded-[var(--radius)] outline-2 outline-offset-2',
                    'outline-transparent opacity-80 transition-opacity hover:opacity-100',
                  )}
                >
                  <motion.div
                    layout={!reduce}
                    layoutId={lid(p.id)}
                    transition={FLIGHT}
                    className="absolute inset-0"
                  >
                    <Tile product={p} ratio="square" showLabel={false} />
                  </motion.div>
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </LayoutGroup>
  )
}

function CarvedSocket({ swatch }: { swatch: string }) {
  return (
    <div
      aria-current="true"
      aria-label="Current item"
      className="relative aspect-square rounded-[var(--radius)]"
      style={{
        background: swatch,
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.12)',
      }}
    >
      <div
        className="absolute inset-0 rounded-[var(--radius)]"
        style={{ background: 'rgba(0,0,0,0.28)' }}
        aria-hidden
      />
    </div>
  )
}
