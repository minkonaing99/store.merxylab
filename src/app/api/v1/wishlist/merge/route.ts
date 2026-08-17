import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { db } from '@/db'
import { wishlists } from '@/db/schema/wishlists'
import { auth } from '@/lib/auth'

const bodySchema = z.object({
  productIds: z.array(z.string().regex(/^[a-z0-9-]+$/)).max(200),
})

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid body.', 400)
  }
  for (const pid of parsed.data.productIds) {
    try {
      await db.insert(wishlists).values({ userId: session.user.id, productId: pid })
    } catch {
      // PK conflict - already in wishlist
    }
  }
  return ok({ ok: true })
}
