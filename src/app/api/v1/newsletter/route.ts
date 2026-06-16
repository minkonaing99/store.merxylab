import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID, randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { newsletterSubscribers } from '@/db/schema/newsletter'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  source: z.string().max(40).optional(),
})

export async function POST(req: Request): Promise<NextResponse> {
  const limit = rateLimit({ key: clientKey(req, 'newsletter'), limit: 5, windowMs: 60 * 60 * 1000 })
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
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid email.', status: 400 } },
      { status: 400 },
    )
  }

  const [existing] = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, parsed.data.email))
    .limit(1)

  if (existing) {
    if (existing.status === 'unsubscribed') {
      await db
        .update(newsletterSubscribers)
        .set({ status: 'active', unsubscribedAt: null })
        .where(eq(newsletterSubscribers.id, existing.id))
    }
    return NextResponse.json({ data: { ok: true }, error: null })
  }

  await db.insert(newsletterSubscribers).values({
    id: randomUUID(),
    email: parsed.data.email,
    source: parsed.data.source ?? 'homepage',
    unsubscribeToken: randomBytes(32).toString('hex'),
  })

  return NextResponse.json({ data: { ok: true }, error: null })
}
