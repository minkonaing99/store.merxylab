import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { mergeGuestCartToUser, getCartLines } from '@/lib/cart-session'
import { cartSubtotal } from '@/lib/pricing'
import { auth } from '@/lib/auth'

export async function POST(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }

  await mergeGuestCartToUser()
  const lines = await getCartLines()
  const subtotal = cartSubtotal(lines)
  return ok({ items: lines, subtotal })
}
