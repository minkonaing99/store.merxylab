'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export function Newsletter() {
  const [email, setEmail] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    if (!valid) {
      toast('Enter a valid email.')
      return
    }
    const res = await fetch('/api/v1/newsletter', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: trimmed, source: 'homepage' }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      toast(json?.error?.message ?? 'Subscription failed.')
      return
    }
    toast(`Thanks - you're on the list. 30% off heading your way.`)
    setEmail('')
  }

  return (
    <section className="container-prose pb-20 md:pb-28">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5 }}
        className="rounded-[var(--radius-lg)] border border-line bg-surface px-6 py-12 text-center md:px-10 md:py-16"
      >
        <div className="eyebrow">Newsletter</div>
        <h2 className="mt-3 font-display text-[30px] leading-[1.1] text-ink md:text-[40px]">
          Subscribe and get <span className="text-accent">30% off</span> Edition 01.
        </h2>
        <p className="mx-auto mt-3 max-w-[44ch] text-[14px] text-muted">
          One short letter a month. New batches, sound tests, the occasional desk tour. No filler.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-7 flex w-full max-w-[440px] items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-cream p-1.5"
        >
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@desk.com"
            className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-[14px] placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-[var(--radius-pill)] bg-ink px-5 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-accent"
          >
            Subscribe
          </button>
        </form>
      </motion.div>
    </section>
  )
}
