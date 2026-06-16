'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { TextField } from '@/components/ui/field'
import { checkPassword, isEmail, maxLen, required } from '@/lib/validators'

interface FieldErrors {
  name?: string
  email?: string
  password?: string
}

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<{ name: boolean; email: boolean; password: boolean }>({
    name: false,
    email: false,
    password: false,
  })

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (name) {
      const m = maxLen(name, 120, 'Name')
      if (m) next.name = m
    }
    const emailReq = required(email, 'Email')
    if (emailReq) next.email = emailReq
    else if (!isEmail(email)) next.email = 'Enter a valid email address.'

    const pwReq = required(password, 'Password')
    if (pwReq) next.password = pwReq
    else {
      const c = checkPassword(password)
      if (!c.ok && c.reason) next.password = c.reason
    }
    return next
  }

  function markTouched(field: keyof FieldErrors) {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validate())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    setTouched({ name: true, email: true, password: true })
    if (Object.keys(v).length > 0) return

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

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <TextField
          label="Name (optional)"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(v) => {
            setName(v)
            if (touched.name) setErrors(validate())
          }}
          onBlur={() => markTouched('name')}
          error={touched.name ? errors.name : null}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(v) => {
            setEmail(v)
            if (touched.email) setErrors(validate())
          }}
          onBlur={() => markTouched('email')}
          error={touched.email ? errors.email : null}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(v) => {
            setPassword(v)
            if (touched.password) setErrors(validate())
          }}
          onBlur={() => markTouched('password')}
          helper="At least 10 characters with upper, lower, and a digit."
          error={touched.password ? errors.password : null}
        />
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
