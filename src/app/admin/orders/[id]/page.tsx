import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderItems } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { addresses } from '@/db/schema/addresses'
import { divisions } from '@/db/schema/divisions'
import { users } from '@/db/schema/auth'
import { requireAdmin } from '@/lib/admin-guard'
import { formatMmk } from '@/lib/money'
import { AdminOrderActions } from './actions'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const guard = await requireAdmin()
  if (!guard.ok) notFound()

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) notFound()

  const [items, [method], [user], [shipping]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(paymentMethods).where(eq(paymentMethods.id, order.paymentMethodId)).limit(1),
    db.select().from(users).where(eq(users.id, order.userId)).limit(1),
    order.shippingAddressId
      ? db.select().from(addresses).where(eq(addresses.id, order.shippingAddressId)).limit(1)
      : Promise.resolve([null]),
  ])

  const [division] = shipping?.divisionId
    ? await db.select().from(divisions).where(eq(divisions.id, shipping.divisionId)).limit(1)
    : [null]

  const hasSlip = Boolean(order.paymentProofUrl)

  return (
    <div>
      <Link href="/admin/orders" className="text-[13px] text-muted hover:text-accent">
        ← All orders
      </Link>
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-[28px]">Order {id.slice(0, 8)}</h2>
          <div className="mt-1 font-mono text-[12px] text-muted">{id}</div>
        </div>
        <div className="text-right">
          <div className="rounded-[var(--radius-pill)] border border-line bg-cream px-3 py-1 text-[12px] uppercase tracking-[0.06em] text-ink">
            {order.status.replace('_', ' ')}
          </div>
          <div className="mt-1 text-[12px] text-muted">{order.placedAt.toLocaleString()}</div>
        </div>
      </div>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="rounded-[var(--radius)] border border-line bg-surface p-5">
          <h3 className="font-display text-[15px]">Customer</h3>
          <div className="mt-3 text-[14px] text-ink">{user?.name ?? '-'}</div>
          <div className="text-[13px] text-muted">{user?.email ?? '-'}</div>
        </article>

        <article className="rounded-[var(--radius)] border border-line bg-surface p-5">
          <h3 className="font-display text-[15px]">Payment</h3>
          <div className="mt-3 text-[14px] text-ink">
            {method?.name ?? order.paymentMethodId}{' '}
            <span className="text-[12px] text-muted">({method?.kind ?? '-'})</span>
          </div>
          {method?.accountName && (
            <div className="mt-2 text-[12px] text-muted">
              Acct name: <span className="text-ink">{method.accountName}</span>
            </div>
          )}
          {method?.accountPhone && (
            <div className="text-[12px] text-muted">
              Acct phone: <span className="font-mono text-ink">{method.accountPhone}</span>
            </div>
          )}
          {order.paymentTxRef && (
            <div className="mt-2 text-[12px] text-muted">
              Tx ref: <span className="font-mono text-ink">{order.paymentTxRef}</span>
            </div>
          )}
        </article>

        <article className="rounded-[var(--radius)] border border-line bg-surface p-5 md:col-span-2">
          <h3 className="font-display text-[15px]">Shipping</h3>
          {shipping ? (
            <div className="mt-3 space-y-1 text-[13px]">
              <div className="text-ink">{shipping.recipient}</div>
              <div className="font-mono text-muted">{shipping.phone}</div>
              <div className="text-ink-soft">
                {shipping.street}
                {shipping.landmark ? ` (${shipping.landmark})` : ''}
              </div>
              <div className="text-ink-soft">
                {shipping.township}, {shipping.city}
                {division ? ` - ${division.name}` : ''}
              </div>
            </div>
          ) : (
            <div className="mt-3 text-[13px] text-muted">No shipping address on file.</div>
          )}
        </article>
      </section>

      <section className="mt-8">
        <h3 className="font-display text-[18px]">Items</h3>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-4 py-3">
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
            <span className="price">{formatMmk(Number(order.subtotalMmk))}</span>
          </li>
          <li className="flex items-center justify-between py-3 text-[13px] text-muted">
            <span>Delivery</span>
            <span className="price">{formatMmk(Number(order.deliveryFeeMmk))}</span>
          </li>
          <li className="flex items-center justify-between py-3">
            <span className="font-display text-[16px]">Total</span>
            <span className="price font-display text-[16px]">{formatMmk(Number(order.totalMmk))}</span>
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h3 className="font-display text-[18px]">Transfer slip</h3>
        {hasSlip ? (
          <div className="mt-3 rounded-[var(--radius)] border border-line bg-surface p-3">
            <a
              href={`/api/v1/orders/${order.id}/slip`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              aria-label="Open slip in a new tab"
            >
              <img
                src={`/api/v1/orders/${order.id}/slip`}
                alt="Transfer slip"
                className="max-h-[640px] w-full rounded-[var(--radius)] object-contain"
              />
            </a>
            <div className="mt-2 text-[12px] text-muted">
              Click to open full size. Cross-check against your bank app before confirming.
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-[var(--radius)] border border-line bg-surface p-5 text-[13px] text-muted">
            {method?.kind === 'cod'
              ? 'Cash on Delivery - no slip required. Phone-confirm with the buyer before marking confirmed.'
              : 'Customer has not uploaded a slip yet.'}
          </div>
        )}
      </section>

      <section className="mt-8">
        <AdminOrderActions
          orderId={order.id}
          status={order.status}
          methodKind={method?.kind === 'cod' ? 'cod' : 'wallet'}
          hasSlip={hasSlip}
        />
      </section>

      {order.notes && (
        <section className="mt-8 rounded-[var(--radius)] border border-line bg-surface p-5">
          <h3 className="font-display text-[15px]">Notes</h3>
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-soft">{order.notes}</p>
        </section>
      )}
    </div>
  )
}
