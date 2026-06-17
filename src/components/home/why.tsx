'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import Image from 'next/image'
import { Tile } from '../product/tile'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

interface WhyProps {
  showcase?: Product
  imageUrl?: string | null
}

const ITEMS = [
  {
    title: 'Build quality',
    body: 'Aluminium, walnut, brass, PBT. Every part chosen for how it feels after a thousand hours.',
  },
  {
    title: 'Switch feel',
    body: 'Pre-lubed stabilisers and hand-tuned switches. Every board ships with the sound profile we promised.',
  },
  {
    title: 'Cable & wireless',
    body: 'Detachable USB-C on every wired board. BLE 5.2 on every wireless one. No proprietary dongles.',
  },
  {
    title: 'Warranty',
    body: 'Two years, no fine print. Switches, sensors, batteries - covered.',
  },
] as const

export function Why({ showcase, imageUrl }: WhyProps) {
  const [open, setOpen] = useState(0)

  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="container-prose grid items-start gap-10 md:grid-cols-2 md:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
        >
          {imageUrl ? (
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius)]">
              <Image src={imageUrl} alt="Why merxylab" fill className="object-contain" />
            </div>
          ) : showcase ? (
            <Tile product={showcase} ratio="square" />
          ) : (
            <div className="aspect-square rounded-[var(--radius)] bg-sand" />
          )}
          {!imageUrl && showcase && (
            <p className="mt-4 max-w-[36ch] text-[13px] text-muted">
              Studio shot of the {showcase.name} - gasket-mounted, hand-tuned, made in small batches.
            </p>
          )}
        </motion.div>

        <div>
          <div className="eyebrow">Why merxylab</div>
          <h2 className="mt-3 font-display text-[36px] leading-[1.05] text-ink md:text-[44px]">
            Made for the desk, not the tournament.
          </h2>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-ink-soft">
            We build peripherals like furniture - slowly, in small runs, with materials that age
            well. Open them, repair them, keep them.
          </p>

          <ul className="mt-8 divide-y divide-line border-y border-line">
            {ITEMS.map((it, i) => {
              const expanded = open === i
              return (
                <li key={it.title}>
                  <button
                    onClick={() => setOpen(expanded ? -1 : i)}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span
                      className={cn(
                        'font-display text-[20px] transition-colors',
                        expanded ? 'text-ink' : 'text-ink-soft',
                      )}
                    >
                      {it.title}
                    </span>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream text-ink-soft">
                      {expanded ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 pr-10 text-[14px] leading-relaxed text-ink-soft">{it.body}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
