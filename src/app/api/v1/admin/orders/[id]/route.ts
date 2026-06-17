import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderItems, type OrderStatus } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { products } from '@/db/schema/products'
import { users } from '@/db/schema/auth'
import { requireAdmin } from '@/lib/admin-guard'
import { sendMail } from '@/lib/mail'
import { formatMmk } from '@/lib/money'
import { OrderInvoice } from '@emails/order-invoice'
import { OrderDelivered } from '@emails/order-delivered'
import { OrderCancelled } from '@emails/order-cancelled'
import { LowStockAlert } from '@emails/low-stock-alert'

const STOCK_COMMIT_STATUSES = new Set<OrderStatus>(['confirmed'])
const LOW_STOCK_DEFAULT = 3

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const patchSchema = z.object({
  status: z.enum([
    'pending_payment',
    'payment_submitted',
    'confirmed',
    'delivered',
    'cancelled',
  ]),
  notes: z.string().max(2000).optional(),
})

// Single-step confirm model. `confirmed` is the payment-confirmation +
// stock-commit + invoice-email boundary for BOTH wallet and COD;
// `delivered` closes the order. Cancel from any state.
const WALLET_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['payment_submitted', 'cancelled'],
  payment_submitted: ['pending_payment', 'confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const COD_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  payment_submitted: [],
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

  const next = parsed.data.status
  const prev = order.status
  const isCommitting = STOCK_COMMIT_STATUSES.has(next) && !STOCK_COMMIT_STATUSES.has(prev)
  const isReleasing = next === 'cancelled' && STOCK_COMMIT_STATUSES.has(prev)

  // Stock is moved only at payment-confirmation boundaries (`paid` or
  // `confirmed`). Pending orders never hold physical inventory.
  const lowStockBreaches: { id: string; remaining: number; name: string }[] = []
  try {
    await db.transaction(async (tx) => {
      if (isCommitting) {
        const items = await tx
          .select({ productId: orderItems.productId, qty: orderItems.qty })
          .from(orderItems)
          .where(eq(orderItems.orderId, id))
        for (const it of items) {
          const res = await tx
            .update(products)
            .set({ stockQty: sql`${products.stockQty} - ${it.qty}` })
            .where(and(eq(products.id, it.productId), sql`${products.stockQty} >= ${it.qty}`))
          const affected = (res as unknown as { affectedRows?: number }).affectedRows ?? 0
          if (affected === 0) {
            throw new Error(`OUT_OF_STOCK:${it.productId}`)
          }
          const [row] = await tx
            .select({ name: products.name, stockQty: products.stockQty, threshold: products.lowStockThreshold })
            .from(products)
            .where(eq(products.id, it.productId))
            .limit(1)
          if (row && row.stockQty <= (row.threshold ?? LOW_STOCK_DEFAULT)) {
            lowStockBreaches.push({ id: it.productId, remaining: row.stockQty, name: row.name })
          }
        }
      } else if (isReleasing) {
        const items = await tx
          .select({ productId: orderItems.productId, qty: orderItems.qty })
          .from(orderItems)
          .where(eq(orderItems.orderId, id))
        for (const it of items) {
          await tx
            .update(products)
            .set({ stockQty: sql`${products.stockQty} + ${it.qty}` })
            .where(eq(products.id, it.productId))
        }
      }

      await tx.update(orders).set(patch).where(eq(orders.id, id))
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.startsWith('OUT_OF_STOCK')) {
      return NextResponse.json(
        { data: null, error: { code: 'OUT_OF_STOCK', message: msg, status: 409 } },
        { status: 409 },
      )
    }
    throw err
  }

  const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1)
  const customerEmail = user?.email
  const total = formatMmk(Number(order.totalMmk))

  // Customer-facing emails: invoice at payment confirmation (paid OR
  // confirmed), delivered note at delivered, cancellation at cancelled.
  // No mail on shipped — invoice email already told them shipping is next.
  if (customerEmail && next !== prev) {
    if (isCommitting) {
      const itemRows = await db
        .select({
          qty: orderItems.qty,
          name: orderItems.nameSnapshot,
          unitPriceMmkSnapshot: orderItems.unitPriceMmkSnapshot,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, id))
      const [methodRow] = await db
        .select({ name: paymentMethods.name })
        .from(paymentMethods)
        .where(eq(paymentMethods.id, order.paymentMethodId))
        .limit(1)
      await sendMail({
        to: customerEmail,
        subject: `Order ${id.slice(0, 8)} — invoice`,
        react: OrderInvoice({
          orderId: id,
          total,
          subtotal: formatMmk(Number(order.subtotalMmk)),
          deliveryFee: formatMmk(Number(order.deliveryFeeMmk)),
          method: methodRow?.name ?? order.paymentMethodId,
          items: itemRows.map((it) => ({
            qty: it.qty,
            name: it.name,
            lineTotal: formatMmk(Number(it.unitPriceMmkSnapshot) * it.qty),
          })),
        }),
      }).catch(() => {})
    } else if (next === 'delivered') {
      await sendMail({
        to: customerEmail,
        subject: `Order ${id.slice(0, 8)} — delivered`,
        react: OrderDelivered({ orderId: id }),
      }).catch(() => {})
    } else if (next === 'cancelled') {
      await sendMail({
        to: customerEmail,
        subject: `Order ${id.slice(0, 8)} — cancelled`,
        react: OrderCancelled({ orderId: id, reason: patch.notes ?? 'Cancelled by merxylab.' }),
      }).catch(() => {})
    }
  }

  if (lowStockBreaches.length > 0) {
    const ownerEmail = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? 'admin@localhost'
    for (const b of lowStockBreaches) {
      await sendMail({
        to: ownerEmail,
        subject: `Low stock: ${b.name}`,
        react: LowStockAlert({ productName: b.name, remaining: b.remaining }),
      }).catch(() => {})
    }
  }

  return NextResponse.json({ data: { ok: true }, error: null })
}
