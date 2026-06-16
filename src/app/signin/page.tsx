'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/account'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      toast('Invalid email or password, or email not verified.')
      return
    }
    // merge guest cart into user cart
    await fetch('/api/v1/cart/merge', { method: 'POST', credentials: 'same-origin' })
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <section className="container-prose max-w-[480px] py-16 md:py-20">
      <div className="eyebrow">Welcome back</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05]">Sign in.</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
          <span className="text-[13px] text-muted">Password</span>
          <input
            type="password"
            required
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <button
        onClick={() => signIn('google', { callbackUrl })}
        className="mt-3 inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream py-3 text-[14px] font-medium text-ink transition-colors hover:border-ink/40"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-[13px] text-muted">
        New to merxylab?{' '}
        <Link href="/signup" className="text-accent underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </section>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="container-prose py-20 text-muted">Loading…</div>}>
      <SignInForm />
    </Suspense>
  )
}
