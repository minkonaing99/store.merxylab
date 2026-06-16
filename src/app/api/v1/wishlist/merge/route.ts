import { NextResponse } from 'next/server'
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
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }
  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid body.', status: 400 } },
      { status: 400 },
    )
  }
  for (const pid of parsed.data.productIds) {
    try {
      await db.insert(wishlists).values({ userId: session.user.id, productId: pid })
    } catch {
      // PK conflict — already in wishlist
    }
  }
  return NextResponse.json({ data: { ok: true }, error: null })
}
