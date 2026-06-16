#!/usr/bin/env node
/**
 * scripts/cancel-expired-orders.ts
 *
 * Cancels stale `pending_payment` orders past their `expires_at` and restores stock.
 * Wire to cron / systemd timer in production.
 *
 *   pnpm cron:cancel-expired
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env', override: false })

import { and, eq, lt, sql } from 'drizzle-orm'
import { db } from '../src/db'
import { orders, orderItems } from '../src/db/schema/orders'
import { products } from '../src/db/schema/products'
import { users } from '../src/db/schema/auth'
import { sendMail } from '../src/lib/mail'
import { OrderCancelled } from '../emails/order-cancelled'

async function main(): Promise<void> {
  const now = new Date()
  const stale = await db
    .select({ id: orders.id, userId: orders.userId })
    .from(orders)
    .where(and(eq(orders.status, 'pending_payment'), lt(orders.expiresAt, now)))

  if (stale.length === 0) {
    console.log('no expired orders')
    process.exit(0)
  }

  console.log(`expiring ${stale.length} order(s)`)

  for (const { id, userId } of stale) {
    await db.transaction(async (tx) => {
      const [latest] = await tx
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1)
      // race-safe: only act if still pending_payment
      if (!latest || latest.status !== 'pending_payment') return

      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, id))
      for (const it of items) {
        await tx
          .update(products)
          .set({ stockQty: sql`${products.stockQty} + ${it.qty}` })
          .where(eq(products.id, it.productId))
      }
      await tx
        .update(orders)
        .set({ status: 'cancelled' })
        .where(and(eq(orders.id, id), eq(orders.status, 'pending_payment')))
    })

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (user?.email) {
      await sendMail({
        to: user.email,
        subject: `Order ${id.slice(0, 8)} cancelled — payment not received`,
        react: OrderCancelled({
          orderId: id,
          reason: 'Payment was not received within 24 hours.',
        }),
      }).catch(() => {})
    }
  }

  console.log('done')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
