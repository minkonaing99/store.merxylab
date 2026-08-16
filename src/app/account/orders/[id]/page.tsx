import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderItems } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { addresses } from '@/db/schema/addresses'
import { divisions } from '@/db/schema/divisions'
import { OrderProgress } from '@/components/order/progress'
import { auth } from '@/lib/auth'
import { formatMmk } from '@/lib/money'
import { customerStatusHint, customerStatusLabel } from '@/lib/order-status'

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

  const [items, [method], [shipping]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db
      .select({ kind: paymentMethods.kind, name: paymentMethods.name })
      .from(paymentMethods)
      .where(eq(paymentMethods.id, order.paymentMethodId))
      .limit(1),
    order.shippingAddressId
      ? db.select().from(addresses).where(eq(addresses.id, order.shippingAddressId)).limit(1)
      : Promise.resolve([null]),
  ])

  const [division] = shipping?.divisionId
    ? await db.select().from(divisions).where(eq(divisions.id, shipping.divisionId)).limit(1)
    : [null]

  const kind = method?.kind ?? 'wallet'
  const hint = customerStatusHint(order.status, kind)
  const subtotal = Number(order.subtotalMmk)
  const deliveryFee = Number(order.deliveryFeeMmk)

  return (
    <div>
      <Link href="/account/orders" className="text-[13px] text-muted hover:text-accent">
        ← All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-display text-[28px]">Order {id.slice(0, 8)}</h2>
        <span className="rounded-[var(--radius-pill)] border border-line bg-surface px-3 py-1 text-[12px] text-ink">
          {customerStatusLabel(order.status, kind)}
        </span>
      </div>
      <div className="mt-1 text-[13px] text-muted">Placed {order.placedAt.toLocaleString()}</div>

      <OrderProgress
        status={order.status}
        kind={kind}
        placedAt={order.placedAt.toISOString()}
        updatedAt={order.updatedAt.toISOString()}
      />

      {hint && (
        <p className="mt-6 max-w-[56ch] rounded-[var(--radius)] border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
          {hint}
        </p>
      )}

      {order.status === 'pending_payment' && (
        <Link
          href={`/order/${order.id}`}
          className="mt-6 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
        >
          {kind === 'cod' ? 'View order details' : 'View payment instructions'}
        </Link>
      )}

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <article className="rounded-[var(--radius)] border border-line bg-surface p-5">
          <h3 className="text-[11px] tracking-[0.08em] text-muted uppercase">Deliver to</h3>
          {shipping ? (
            <div className="mt-3 space-y-0.5 text-[13px] leading-relaxed text-ink-soft">
              <div className="text-ink">{shipping.recipient}</div>
              <div className="font-mono text-[12px]">{shipping.phone}</div>
              <div>{shipping.street}</div>
              <div>
                {shipping.township}, {shipping.city}
              </div>
              {division && <div>{division.name}</div>}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted">Address no longer on file.</p>
          )}
        </article>

        <article className="rounded-[var(--radius)] border border-line bg-surface p-5">
          <h3 className="text-[11px] tracking-[0.08em] text-muted uppercase">Payment</h3>
          <div className="mt-3 text-[13px] text-ink">{method?.name ?? 'Payment method'}</div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            {kind === 'cod'
              ? 'Cash on delivery - pay the courier when the parcel arrives.'
              : 'Bank transfer or mobile wallet, verified by hand.'}
          </p>
          {order.paymentTxRef && (
            <div className="mt-3 text-[12px] text-muted">
              Reference <span className="font-mono text-ink">{order.paymentTxRef}</span>
            </div>
          )}
        </article>
      </section>

      <ul className="mt-6 divide-y divide-line border-y border-line">
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
        <li className="flex items-center justify-between py-3 text-[13px] text-muted">
          <span>Subtotal</span>
          <span className="price">{formatMmk(subtotal)}</span>
        </li>
        <li className="flex items-center justify-between py-3 text-[13px] text-muted">
          <span>Delivery</span>
          <span className="price">{deliveryFee > 0 ? formatMmk(deliveryFee) : 'Free'}</span>
        </li>
        <li className="flex items-center justify-between py-4">
          <span className="font-display text-[18px]">Total</span>
          <span className="price font-display text-[18px]">
            {formatMmk(Number(order.totalMmk))}
          </span>
        </li>
      </ul>

      <p className="mt-6 text-[12px] text-muted">
        Something wrong with this order?{' '}
        <Link href="/contact" className="text-ink underline underline-offset-4 hover:text-accent">
          Message us
        </Link>{' '}
        with the order number above.
      </p>
    </div>
  )
}
