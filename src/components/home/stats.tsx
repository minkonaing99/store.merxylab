'use client'

import { motion } from 'framer-motion'

const STATS = [
  { value: '50K+', label: 'keystrokes tested per board' },
  { value: '200+', label: 'switch variants vetted' },
  { value: '99%', label: 'shipped on time, every batch' },
] as const

export function Stats() {
  return (
    <section className="container-prose border-y border-line py-12 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-10"
      >
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col items-start sm:items-center sm:text-center">
            <span className="font-display text-[44px] leading-none text-ink md:text-[56px]">
              {s.value}
            </span>
            <span className="mt-3 max-w-[24ch] text-[13px] leading-relaxed text-muted">
              {s.label}
            </span>
          </div>
        ))}
      </motion.div>
    </section>
  )
}
