import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders, type OrderStatus } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { users } from '@/db/schema/auth'
import { requireAdmin } from '@/lib/admin-guard'
import { sendMail } from '@/lib/mail'
import { formatMmk } from '@/lib/money'
import { OrderPaid } from '@emails/order-paid'
import { OrderShipped } from '@emails/order-shipped'
import { OrderCancelled } from '@emails/order-cancelled'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const patchSchema = z.object({
  status: z.enum([
    'pending_payment',
    'payment_submitted',
    'confirmed',
    'paid',
    'shipped',
    'delivered',
    'cancelled',
  ]),
  notes: z.string().max(2000).optional(),
})

const WALLET_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['payment_submitted', 'cancelled'],
  payment_submitted: ['pending_payment', 'paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  confirmed: [],
  cancelled: [],
}

const COD_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  payment_submitted: [],
  paid: [],
  cancelled: [],
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: guard.message, status: guard.status } },
      { status: guard.status },
    )
  }
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid id.', status: 400 } },
      { status: 400 },
    )
  }
  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid status.', status: 400 } },
      { status: 400 },
    )
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Order not found.', status: 404 } },
      { status: 404 },
    )
  }

  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.id, order.paymentMethodId))
    .limit(1)
  const transitions = method?.kind === 'cod' ? COD_TRANSITIONS : WALLET_TRANSITIONS
  const allowed = transitions[order.status]

  if (order.status !== parsed.data.status && !allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'CONFLICT',
          message: `Cannot transition ${order.status} → ${parsed.data.status}.`,
          status: 409,
        },
      },
      { status: 409 },
    )
  }

  const patch: { status: OrderStatus; notes?: string } = { status: parsed.data.status }
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes

  await db.update(orders).set(patch).where(eq(orders.id, id))

  const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1)
  const customerEmail = user?.email
  const total = formatMmk(Number(order.totalMmk))

  if (customerEmail && parsed.data.status !== order.status) {
    if (parsed.data.status === 'paid') {
      await sendMail({
        to: customerEmail,
        subject: `Order ${id.slice(0, 8)} — payment received`,
        react: OrderPaid({ orderId: id, total }),
      }).catch(() => {})
    } else if (parsed.data.status === 'shipped') {
      await sendMail({
        to: customerEmail,
        subject: `Order ${id.slice(0, 8)} — shipped`,
        react: OrderShipped({ orderId: id, trackingRef: patch.notes ?? null }),
      }).catch(() => {})
    } else if (parsed.data.status === 'cancelled') {
      await sendMail({
        to: customerEmail,
        subject: `Order ${id.slice(0, 8)} — cancelled`,
        react: OrderCancelled({ orderId: id, reason: patch.notes ?? 'Cancelled by merxylab.' }),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ data: { ok: true }, error: null })
}
