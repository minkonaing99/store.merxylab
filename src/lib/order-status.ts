import type { OrderStatus } from '@/db/schema/orders'

export type MethodKind = 'wallet' | 'cod'

/**
 * Customer-facing status wording.
 *
 * `pending_payment` means two different things depending on how the order is
 * paid: a wallet customer owes a transfer, a COD customer owes nothing until
 * the courier arrives and is simply waiting on our confirmation call. Never
 * show the raw enum to a customer.
 */
export function customerStatusLabel(status: OrderStatus, kind: MethodKind): string {
  switch (status) {
    case 'pending_payment':
      return kind === 'cod' ? 'Awaiting confirmation' : 'Awaiting payment'
    case 'payment_submitted':
      return 'Slip received'
    case 'confirmed':
      return kind === 'cod' ? 'Confirmed - pay on delivery' : 'Confirmed'
    case 'delivered':
      return 'Delivered'
    case 'cancelled':
      return 'Cancelled'
  }
}

/** One line of "what happens next", or null when nothing is expected of anyone. */
export function customerStatusHint(status: OrderStatus, kind: MethodKind): string | null {
  if (status === 'pending_payment') {
    return kind === 'cod'
      ? 'We will call to confirm this order within 3 hours. Pay the courier in cash on delivery.'
      : 'Transfer the total, then upload your payment slip. Unpaid orders are cancelled after 24 hours.'
  }
  if (status === 'payment_submitted') return 'We are checking your slip against our bank records.'
  if (status === 'confirmed') {
    return kind === 'cod'
      ? 'Packed and on the way. Have the exact amount ready for the courier.'
      : 'Payment confirmed. Your order is on its way.'
  }
  return null
}
