'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Tile } from '../product/tile'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

interface HeroProps {
  featured: readonly Product[]
}

export function Hero({ featured }: HeroProps) {
  const [active, setActive] = useState(0)
  const hero = featured[0]
  if (!hero) return null
  const thumbs = featured.slice(0, 4)
  const current = thumbs[active] ?? hero

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

        <div className="flex items-stretch gap-3 md:gap-4">
          <motion.div
            key={current.id}
            initial={{ opacity: 0.6, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            <Tile product={current} ratio="portrait" priority useThumb={false} />
          </motion.div>
          <div className="flex w-[88px] flex-col gap-3">
            {thumbs.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActive(i)}
                aria-label={`Show ${p.name}`}
                className={cn(
                  'overflow-hidden rounded-[10px] outline-2 outline-offset-2 transition-all',
                  i === active ? 'outline-accent' : 'outline-transparent opacity-70 hover:opacity-100',
                )}
              >
                <Tile product={p} ratio="square" showLabel={false} />
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="mt-10 flex items-center justify-center gap-1.5 md:hidden">
        {thumbs.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === active ? 'w-6 bg-ink' : 'w-1.5 bg-line',
            )}
          />
        ))}
      </div>
    </section>
  )
}
