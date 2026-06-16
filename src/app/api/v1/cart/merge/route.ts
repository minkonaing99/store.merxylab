import { NextResponse } from 'next/server'
import { mergeGuestCartToUser, getCartLines } from '@/lib/cart-session'
import { auth } from '@/lib/auth'

export async function POST(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }

  await mergeGuestCartToUser()
  const lines = await getCartLines()
  const subtotal = lines.reduce((sum, l) => sum + l.product.priceMmk * l.qty, 0)
  return NextResponse.json({ data: { items: lines, subtotal }, error: null })
}
