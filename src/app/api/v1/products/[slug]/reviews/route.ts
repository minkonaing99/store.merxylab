import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { reviews } from '@/db/schema/reviews'
import { users } from '@/db/schema/auth'
import { products } from '@/db/schema/products'
import { orderItems, orders } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const SLUG_RE = /^[a-z0-9-]+$/

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(120).optional(),
  body: z
    .string()
    .min(10)
    .max(2000)
    .transform((s) => s.replace(/<[^>]*>/g, '').trim()),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid slug.', status: 400 } },
      { status: 400 },
    )
  }

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1)
  if (!product) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Product not found.', status: 404 } },
      { status: 404 },
    )
  }

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      verifiedPurchase: reviews.verifiedPurchase,
      createdAt: reviews.createdAt,
      userName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.productId, product.id), eq(reviews.status, 'approved')))
    .orderBy(desc(reviews.createdAt))

  return NextResponse.json({ data: rows, error: null })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }

  const limit = rateLimit({
    key: clientKey(req, `review:${session.user.id}`),
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMITED', message: 'Too many reviews.', status: 429 } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const { slug } = await params
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid slug.', status: 400 } },
      { status: 400 },
    )
  }

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1)
  if (!product) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Product not found.', status: 404 } },
      { status: 404 },
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

  // verified-purchase check
  const [purchase] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.userId, session.user.id), eq(orderItems.productId, product.id)))
    .limit(1)

  try {
    await db.insert(reviews).values({
      id: randomUUID(),
      productId: product.id,
      userId: session.user.id,
      rating: parsed.data.rating,
      title: parsed.data.title ?? null,
      body: parsed.data.body,
      status: 'pending',
      verifiedPurchase: Boolean(purchase),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('uniq_review_user_product') || msg.includes('Duplicate')) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'CONFLICT',
            message: 'You have already reviewed this product.',
            status: 409,
          },
        },
        { status: 409 },
      )
    }
    throw err
  }

  return NextResponse.json({ data: { ok: true, status: 'pending' }, error: null })
}
