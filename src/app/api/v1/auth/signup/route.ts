import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID, randomBytes, createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users, verificationTokens } from '@/db/schema/auth'
import { sendMail } from '@/lib/mail'
import { VerifyEmail } from '@emails/verify-email'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  password: z
    .string()
    .min(10)
    .max(200)
    .regex(/[a-z]/, 'lowercase required')
    .regex(/[A-Z]/, 'uppercase required')
    .regex(/[0-9]/, 'digit required'),
  name: z.string().min(1).max(120).optional(),
})

const VERIFICATION_TTL_MIN = 30
const BCRYPT_ROUNDS = 12

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export async function POST(req: Request): Promise<NextResponse> {
  const limit = rateLimit({ key: clientKey(req, 'signup'), limit: 5, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests.', status: 429 } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email or password invalid.',
          status: 400,
        },
      },
      { status: 400 },
    )
  }

  const { email, password, name } = parsed.data
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (existing && existing.passwordHash) {
    // generic response to avoid account enumeration
    return NextResponse.json({ data: { ok: true }, error: null })
  }

  let userId: string
  if (!existing) {
    userId = randomUUID()
    await db.insert(users).values({
      id: userId,
      email,
      name: name ?? null,
      passwordHash: hash,
      role: 'customer',
    })
  } else {
    userId = existing.id
    // OAuth-only user adding a password
    await db
      .update(users)
      .set({ passwordHash: hash, name: name ?? existing.name })
      .where(eq(users.id, userId))
  }

  // verification token (sha256 hashed at rest)
  const raw_token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + VERIFICATION_TTL_MIN * 60_000)
  await db.insert(verificationTokens).values({
    identifier: email,
    token: hashToken(raw_token),
    expires,
  })

  const verifyUrl = `${process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL}/verify?token=${raw_token}&email=${encodeURIComponent(email)}`

  await sendMail({
    to: email,
    subject: 'Verify your merxylab account',
    react: VerifyEmail({ verifyUrl, ttlMinutes: VERIFICATION_TTL_MIN }),
  })

  return NextResponse.json({ data: { ok: true }, error: null })
}
