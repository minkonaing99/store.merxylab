'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, name: name || undefined }),
    })
    setLoading(false)
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      toast(json?.error?.message ?? 'Sign-up failed.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section className="container-prose max-w-[480px] py-20 text-center md:py-28">
        <div className="eyebrow">Check your inbox</div>
        <h1 className="mt-3 font-display text-[40px] leading-[1.05]">Verify your email.</h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-[15px] text-ink-soft">
          We sent a verification link to <strong className="text-ink">{email}</strong>. The link
          expires in 30 minutes.
        </p>
        <p className="mt-6 text-[13px] text-muted">
          Already verified?{' '}
          <Link href="/signin" className="text-accent underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="container-prose max-w-[480px] py-16 md:py-20">
      <div className="eyebrow">Create account</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05]">Sign up.</h1>
      <p className="mt-3 text-[15px] text-ink-soft">
        Save addresses, track orders, keep a wishlist.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-[13px] text-muted">Name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-4 py-3 text-[15px] focus:outline-none focus:border-ink/40"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-4 py-3 text-[15px] focus:outline-none focus:border-ink/40"
          />
        </label>
        <label className="block">
          <span className="text-[13px] text-muted">
            Password (≥10 chars, mixed case + digit)
          </span>
          <input
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-4 py-3 text-[15px] focus:outline-none focus:border-ink/40"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-ink py-3.5 text-[14px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        Already have an account?{' '}
        <Link href="/signin" className="text-accent underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </section>
  )
}
