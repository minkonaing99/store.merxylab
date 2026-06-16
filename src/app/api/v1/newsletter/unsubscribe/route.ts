import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { newsletterSubscribers } from '@/db/schema/newsletter'

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''
  if (!token || token.length !== 64) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid token.', status: 400 } },
      { status: 400 },
    )
  }
  await db
    .update(newsletterSubscribers)
    .set({ status: 'unsubscribed', unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribers.unsubscribeToken, token))
  return NextResponse.json({ data: { ok: true }, error: null })
}
