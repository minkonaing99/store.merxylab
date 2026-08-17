import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { getCartLines, removeCartItem, setCartItemQty } from '@/lib/cart-session'

const SLUG_RE = /^[a-z0-9-]+$/

const patchSchema = z.object({
  qty: z.number().int().min(0).max(99),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
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
  _req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
  const { productId } = await params
  if (!SLUG_RE.test(productId)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  await removeCartItem(productId)
  const lines = await getCartLines()
  const subtotal = lines.reduce((sum, l) => sum + l.product.priceMmk * l.qty, 0)
  return ok({ items: lines, subtotal })
}
