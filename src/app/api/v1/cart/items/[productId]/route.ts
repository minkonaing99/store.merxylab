import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { getCartLines, removeCartItem, setCartItemQty } from '@/lib/cart-session'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const SLUG_RE = /^[a-z0-9-]+$/

const patchSchema = z.object({
  qty: z.number().int().min(0).max(99),
})

/** Same bucket and budget as the sibling POST - one cart, one allowance. */
function cartLimit(req: Request) {
  return rateLimit({ key: clientKey(req, 'cart'), limit: 60, windowMs: 60_000 })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
  const limit = cartLimit(req)
  if (!limit.allowed) {
    return rateLimited('Too many requests.', limit.retryAfterSeconds)
  }

  const { productId } = await params
  if (!SLUG_RE.test(productId)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }

  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid body.', 400)
  }

  await setCartItemQty(productId, parsed.data.qty)
  const lines = await getCartLines()
  const subtotal = lines.reduce((sum, l) => sum + l.product.priceMmk * l.qty, 0)
  return ok({ items: lines, subtotal })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
  const limit = cartLimit(req)
  if (!limit.allowed) {
    return rateLimited('Too many requests.', limit.retryAfterSeconds)
  }

  const { productId } = await params
  if (!SLUG_RE.test(productId)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  await removeCartItem(productId)
  const lines = await getCartLines()
  const subtotal = lines.reduce((sum, l) => sum + l.product.priceMmk * l.qty, 0)
  return ok({ items: lines, subtotal })
}
