import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderItems } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { formatMmk } from '@/lib/money'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const session = await auth()
  if (!session?.user?.id) return null

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, session.user.id)))
    .limit(1)
  if (!order) notFound()

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id))

  return (
    <div>
      <Link
        href="/account/orders"
        className="text-[13px] text-muted hover:text-accent"
      >
        ← All orders
      </Link>
      <h2 className="mt-4 font-display text-[28px]">Order {id.slice(0, 8)}</h2>
      <div className="mt-1 text-[13px] text-muted">
        {order.placedAt.toLocaleString()} · {order.status.replace('_', ' ')}
      </div>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {items.map((it) => (
          <li key={it.id} className="flex items-center justify-between gap-4 py-4">
            <span className="text-[14px] text-ink-soft">
              {it.qty} × {it.nameSnapshot}
            </span>
            <span className="price text-[14px]">
              {formatMmk(Number(it.unitPriceMmkSnapshot) * it.qty)}
            </span>
          </li>
        ))}
        <li className="flex items-center justify-between py-4">
          <span className="font-display text-[18px]">Total</span>
          <span className="price font-display text-[18px]">{formatMmk(Number(order.totalMmk))}</span>
        </li>
      </ul>

      {order.status === 'pending_payment' && (
        <Link
          href={`/order/${order.id}`}
          className="mt-8 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
        >
          View payment instructions
        </Link>
      )}
    </div>
  )
}
