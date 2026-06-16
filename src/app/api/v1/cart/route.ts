import { NextResponse } from 'next/server'
import { getCartLines } from '@/lib/cart-session'

export async function GET(): Promise<NextResponse> {
  const lines = await getCartLines()
  const subtotal = lines.reduce((sum, l) => sum + l.product.priceMmk * l.qty, 0)
  return NextResponse.json({ data: { items: lines, subtotal }, error: null })
}
