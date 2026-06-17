import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { CheckCircle2 } from 'lucide-react'
import { db } from '@/db'
import { orders, orderItems } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { auth } from '@/lib/auth'
import { r2PublicUrl } from '@/lib/cdn'
import { formatMmk } from '@/lib/money'
import { WalletPanel } from './wallet-panel'
import { CancelButton } from './cancel-button'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const dynamic = 'force-dynamic'

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const session = await auth()
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/order/${id}`)

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, session.user.id)))
    .limit(1)

  if (!order) notFound()

  const [items, [method]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(paymentMethods).where(eq(paymentMethods.id, order.paymentMethodId)).limit(1),
  ])

  const tgUsername = process.env.TELEGRAM_BACKUP_USERNAME ?? ''
  const tgUrl = tgUsername ? `https://t.me/${tgUsername}` : null

  return (
    <article className="container-prose max-w-[760px] py-16 md:py-20">
      <div className="flex items-center gap-3 text-[var(--color-success)]">
        <CheckCircle2 size={22} strokeWidth={1.75} />
        <div className="eyebrow">Order received</div>
      </div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-ink md:text-[52px]">
        Thanks &mdash; we&rsquo;ve got your order.
      </h1>
      <p className="mt-3 text-[15px] text-ink-soft">
        Reference <code className="rounded bg-surface px-2 py-0.5 text-[13px] tabular-nums">{id}</code>
      </p>

      {order.status === 'pending_payment' && method?.kind === 'wallet' && (
        <WalletPanel
          orderId={order.id}
          totalMmk={Number(order.totalMmk)}
          method={{
            name: method.name,
            accountName: method.accountName,
            accountPhone: method.accountPhone,
            qrImageUrl: r2PublicUrl(method.qrImageUrl),
            instructionsMd: method.instructionsMd,
          }}
          telegramUrl={tgUrl}
          existingProofUrl={order.paymentProofUrl}
        />
      )}

      {order.status === 'pending_payment' && method?.kind === 'cod' && (
        <section className="mt-10 rounded-[var(--radius-lg)] border border-line bg-surface p-6 md:p-8">
          <h2 className="font-display text-[22px]">Cash on Delivery</h2>
          <p className="mt-3 text-[14px] text-ink-soft">
            We&rsquo;ll call to confirm the order before shipping. The driver will collect{' '}
            <span className="price font-medium text-ink">{formatMmk(Number(order.totalMmk))}</span>{' '}
            at the door.
          </p>
        </section>
      )}

      {order.status === 'payment_submitted' && (
        <section className="mt-10 rounded-[var(--radius-lg)] border border-accent/30 bg-accent/5 p-6 md:p-8">
          <h2 className="font-display text-[22px] text-accent">Slip received. Verifying with bank.</h2>
          <p className="mt-2 text-[14px] text-ink-soft">
            Usually within a few hours during business time.
          </p>
          {order.paymentProofUrl && (
            <img
              src={`/api/v1/orders/${order.id}/slip`}
              alt="Submitted slip"
              className="mt-4 max-h-64 rounded-[var(--radius)] border border-line"
            />
          )}
        </section>
      )}

      {order.status === 'confirmed' && (
        <section className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-6 md:p-8">
          <h2 className="font-display text-[22px] text-[var(--color-success)]">Confirmed.</h2>
          <p className="mt-2 text-[14px] text-ink-soft">
            Payment received. Your order is being prepared for delivery.
          </p>
        </section>
      )}

      {order.status === 'delivered' && (
        <section className="mt-10 rounded-[var(--radius-lg)] border border-line bg-surface p-6 md:p-8">
          <h2 className="font-display text-[22px]">Delivered.</h2>
        </section>
      )}

      {order.status === 'cancelled' && (
        <section className="mt-10 rounded-[var(--radius-lg)] border border-error/30 bg-error/5 p-6 md:p-8">
          <h2 className="font-display text-[22px] text-error">Cancelled.</h2>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-[22px]">Items</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-3.5 text-[14px]">
              <span className="text-ink-soft">
                {it.qty} × {it.nameSnapshot}
              </span>
              <span className="price text-ink">
                {formatMmk(Number(it.unitPriceMmkSnapshot) * it.qty)}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between py-2.5 text-[13px]">
            <span className="text-ink-soft">Subtotal</span>
            <span className="price text-ink">{formatMmk(Number(order.subtotalMmk))}</span>
          </li>
          <li className="flex items-center justify-between py-2.5 text-[13px]">
            <span className="text-ink-soft">Delivery</span>
            <span className="price text-ink">{formatMmk(Number(order.deliveryFeeMmk))}</span>
          </li>
          <li className="flex items-center justify-between py-4">
            <span className="font-display text-[18px]">Total</span>
            <span className="price font-display text-[20px]">
              {formatMmk(Number(order.totalMmk))}
            </span>
          </li>
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/account/orders"
          className="inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
        >
          View all orders
        </Link>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream px-6 py-3 text-[14px] font-medium text-ink hover:border-ink/40"
        >
          Keep shopping
        </Link>
        {order.status === 'pending_payment' && <CancelButton orderId={order.id} />}
        {tgUrl && (
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-accent underline underline-offset-4"
          >
            Need help? Message us on Telegram →
          </a>
        )}
      </div>
    </article>
  )
}
