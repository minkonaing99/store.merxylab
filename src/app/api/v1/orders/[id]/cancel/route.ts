import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { sendMail } from '@/lib/mail'
import { OrderCancelled } from '@emails/order-cancelled'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ data: null, error: { code, message, status } }, { status })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return jsonError('UNAUTHENTICATED', 'Sign in required.', 401)
  const userId = session.user.id

  const { id } = await params
  if (!UUID_RE.test(id)) return jsonError('VALIDATION_ERROR', 'Invalid id.', 400)

  const limit = rateLimit({
    key: clientKey(req, `cancel:${userId}`),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMITED', message: 'Too many cancel attempts.', status: 429 } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  // Pending orders never held physical stock (committed only at `paid`/
  // `confirmed`), so cancel is a pure status flip - no inventory math.
  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .limit(1)
    if (!order) return { kind: 'NOT_FOUND' as const }
    if (order.status !== 'pending_payment') return { kind: 'CONFLICT' as const }

    await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, id))

    return { kind: 'OK' as const, total: Number(order.totalMmk) }
  })

  if (result.kind === 'NOT_FOUND') return jsonError('NOT_FOUND', 'Order not found.', 404)
  if (result.kind === 'CONFLICT') {
    return jsonError('CONFLICT', 'Only pending orders can be cancelled. Contact us via Telegram.', 409)
  }

  await sendMail({
    to: session.user.email ?? '',
    subject: `Order ${id.slice(0, 8)} cancelled`,
    react: OrderCancelled({ orderId: id, reason: 'Customer cancelled.' }),
  }).catch(() => {})

  return NextResponse.json({ data: { ok: true }, error: null })
}
