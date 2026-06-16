import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { wishlists } from '@/db/schema/wishlists'
import { products } from '@/db/schema/products'
import { auth } from '@/lib/auth'

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }
  const rows = await db
    .select({
      productId: wishlists.productId,
      addedAt: wishlists.addedAt,
      product: {
        id: products.id,
        slug: products.slug,
        name: products.name,
        tagline: products.tagline,
        priceMmk: products.priceMmk,
        swatch: products.swatch,
        hasPhotos: products.hasPhotos,
        stockQty: products.stockQty,
        lowStockThreshold: products.lowStockThreshold,
        category: products.categoryId,
      },
    })
    .from(wishlists)
    .innerJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, session.user.id))
  return NextResponse.json({ data: rows, error: null })
}
