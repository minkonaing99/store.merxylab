import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { wishlists } from '@/db/schema/wishlists'
import { products } from '@/db/schema/products'
import { auth } from '@/lib/auth'

const SLUG_RE = /^[a-z0-9-]+$/

async function requireUser() {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
  const userId = await requireUser()
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }
  const { productId } = await params
  if (!SLUG_RE.test(productId)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid id.', status: 400 } },
      { status: 400 },
    )
  }
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1)
  if (!product) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Product not found.', status: 404 } },
      { status: 404 },
    )
  }
  try {
    await db.insert(wishlists).values({ userId, productId })
  } catch {
    // ignore duplicates (PK conflict)
  }
  return NextResponse.json({ data: { ok: true }, error: null })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
  const userId = await requireUser()
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }
  const { productId } = await params
  if (!SLUG_RE.test(productId)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid id.', status: 400 } },
      { status: 400 },
    )
  }
  await db
    .delete(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
  return NextResponse.json({ data: { ok: true }, error: null })
}
