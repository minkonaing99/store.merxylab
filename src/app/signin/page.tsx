'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { TextField } from '@/components/ui/field'
import { isEmail, required } from '@/lib/validators'

interface FieldErrors {
  email?: string
  password?: string
}

function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/account'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<keyof FieldErrors, boolean>>({
    email: false,
    password: false,
  })
  const [loading, setLoading] = useState(false)

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    const emailReq = required(email, 'Email')
    if (emailReq) next.email = emailReq
    else if (!isEmail(email)) next.email = 'Enter a valid email address.'
    const pwReq = required(password, 'Password')
    if (pwReq) next.password = pwReq
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
    setTouched({ email: true, password: true })
    if (Object.keys(v).length > 0) return

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
    await fetch('/api/v1/cart/merge', { method: 'POST', credentials: 'same-origin' })
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <section className="container-prose max-w-[480px] py-16 md:py-20">
      <div className="eyebrow">Welcome back</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05]">Sign in.</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(v) => {
            setPassword(v)
            if (touched.password) setErrors(validate())
          }}
          onBlur={() => markTouched('password')}
          error={touched.password ? errors.password : null}
        />
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
