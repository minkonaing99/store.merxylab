import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { products } from '@/db/schema/products'
import { addCartItem, getCartLines } from '@/lib/cart-session'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  productId: z.string().regex(/^[a-z0-9-]+$/),
  qty: z.number().int().min(1).max(99).default(1),
})

export async function POST(req: Request): Promise<NextResponse> {
  const limit = rateLimit({ key: clientKey(req, 'cart'), limit: 60, windowMs: 60_000 })
  if (!limit.allowed) {
    return rateLimited('Too many requests.', limit.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid body.', 400)
  }

  // Live DB read - bypass the catalog cache so stock is current.
  const [row] = await db
    .select({ stockQty: products.stockQty, isActive: products.isActive })
    .from(products)
    .where(eq(products.id, parsed.data.productId))
    .limit(1)
  if (!row || !row.isActive) {
    return fail('NOT_FOUND', 'Product not found.', 404)
  }
  if (row.stockQty <= 0) {
    return fail('OUT_OF_STOCK', 'Out of stock.', 409)
  }

  await addCartItem(parsed.data.productId, parsed.data.qty)
  const lines = await getCartLines()
  const subtotal = lines.reduce((sum, l) => sum + l.product.priceMmk * l.qty, 0)
  return ok({ items: lines, subtotal })
}
