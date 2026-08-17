import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { createHash } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/db'
import { users, verificationTokens } from '@/db/schema/auth'

const schema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  token: z.string().length(64),
})

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export async function POST(req: Request): Promise<NextResponse> {
  const raw = await req.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid token.', 400)
  }

  const { email, token } = parsed.data
  const tokenHash = hashToken(token)
  const now = new Date()

  const [match] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, tokenHash),
        gt(verificationTokens.expires, now),
      ),
    )
    .limit(1)

  if (!match) {
    return fail('NOT_FOUND', 'Token invalid or expired.', 404)
  }

  await db.update(users).set({ emailVerified: now }).where(eq(users.email, email))
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, tokenHash),
      ),
    )

  return ok({ ok: true })
}
