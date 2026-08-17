import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderItems } from '@/db/schema/orders'
import { addresses } from '@/db/schema/addresses'
import { divisions } from '@/db/schema/divisions'
import { paymentMethods } from '@/db/schema/payment-methods'
import { auth } from '@/lib/auth'
import { getCartLines, clearCart } from '@/lib/cart-session'
import { sendMail } from '@/lib/mail'
import { maskEmail } from '@/lib/mask'
import { formatMmk } from '@/lib/money'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { sendTelegram } from '@/lib/telegram'
import { NewOrderAlert } from '@emails/new-order-alert'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PHONE_REGEX = /^\+959\d{7,9}$/
const COD_CAP_MMK = 500_000
const ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000

const newAddressSchema = z.object({
  label: z.string().min(1).max(40),
  recipient: z.string().min(1).max(120),
  phone: z.string().regex(PHONE_REGEX).max(20),
  divisionId: z.string().min(1).max(40),
  city: z.string().min(1).max(120),
  township: z.string().min(1).max(120),
  street: z.string().min(1).max(200),
  landmark: z.string().max(200).nullable().optional(),
  saveToAccount: z.boolean().optional().default(false),
})

const bodySchema = z
  .object({
    shippingAddressId: z.string().regex(UUID_RE).optional(),
    newAddress: newAddressSchema.optional(),
    paymentMethodId: z.string().min(1).max(40),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine((b) => Boolean(b.shippingAddressId) !== Boolean(b.newAddress), {
    message: 'Provide either shippingAddressId or newAddress (not both).',
  })

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const userId = session.user.id

  const limit = rateLimit({
    key: clientKey(req, `orders:${userId}`),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return rateLimited('Too many orders.', limit.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body.', 400)
  }

  let shippingAddressId: string
  let divisionId: string
  // Held rather than written. Everything below can still reject the checkout,
  // and a rejected checkout must not leave an address on the customer's account
  // - nor hand an unchecked `divisionId` to the foreign key, which surfaces as
  // a 500 instead of the 400 the division lookup gives.
  let addressToCreate: typeof addresses.$inferInsert | null = null

  if (parsed.data.shippingAddressId) {
    const [addr] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, parsed.data.shippingAddressId), eq(addresses.userId, userId)))
      .limit(1)
    if (!addr) {
      return fail('NOT_FOUND', 'Address not found.', 404)
    }
    shippingAddressId = addr.id
    divisionId = addr.divisionId
  } else if (parsed.data.newAddress) {
    const na = parsed.data.newAddress
    divisionId = na.divisionId
    shippingAddressId = randomUUID()
    addressToCreate = {
      id: shippingAddressId,
      userId,
      label: na.saveToAccount ? na.label : `Order ${new Date().toISOString().slice(0, 10)}`,
      recipient: na.recipient,
      phone: na.phone,
      divisionId: na.divisionId,
      city: na.city,
      township: na.township,
      street: na.street,
      landmark: na.landmark ?? null,
      isDefault: false,
    }
  } else {
    return fail('VALIDATION_ERROR', 'Missing address.', 400)
  }

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1)
  if (!division || division.isBlocked) {
    return fail('VALIDATION_ERROR', 'Delivery to that division is unavailable.', 400)
  }

  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, parsed.data.paymentMethodId), eq(paymentMethods.isActive, true)))
    .limit(1)
  if (!method) {
    return fail('VALIDATION_ERROR', 'Payment method unavailable.', 400)
  }

  const lines = await getCartLines()
  if (lines.length === 0) {
    return fail('VALIDATION_ERROR', 'Cart is empty.', 400)
  }

  const subtotal = lines.reduce((sum, l) => sum + l.product.priceMmk * l.qty, 0)
  const deliveryFee = division.deliveryFeeMmk
  const total = subtotal + deliveryFee

  if (method.kind === 'cod') {
    if (!division.codAllowed || total > COD_CAP_MMK) {
      return fail('VALIDATION_ERROR', `Cash on Delivery available only for Yangon/Mandalay orders under ${formatMmk(COD_CAP_MMK)}.`, 400)
    }
  }

  // Snapshot stock check only - no decrement yet. Stock is held against the
  // physical inventory at payment confirmation (admin flips to `paid` for
  // wallet, `confirmed` for COD). Avoids "ghost reservations" when checkout
  // succeeds but slip upload fails or customer abandons.
  for (const l of lines) {
    if (l.product.stockQty < l.qty) {
      return fail('OUT_OF_STOCK', `OUT_OF_STOCK:${l.productId}`, 409)
    }
  }

  const orderId = randomUUID()
  const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MS)

  await db.transaction(async (tx) => {
    // Inside the transaction so the address and the order it exists for are
    // written together or not at all.
    if (addressToCreate) {
      await tx.insert(addresses).values(addressToCreate)
    }

    await tx.insert(orders).values({
      id: orderId,
      userId,
      status: 'pending_payment',
      subtotalMmk: subtotal,
      deliveryFeeMmk: deliveryFee,
      totalMmk: total,
      shippingAddressId,
      paymentMethodId: method.id,
      paymentRef: orderId,
      expiresAt,
      notes: parsed.data.notes ?? null,
    })

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId,
        productId: l.productId,
        qty: l.qty,
        unitPriceMmkSnapshot: l.product.priceMmk,
        nameSnapshot: l.product.name,
      })),
    )
  })

  await clearCart()

  // No customer email on placement - invoice is sent at payment confirmation
  // (admin → paid / confirmed) instead, to avoid spamming the buyer.
  const ownerEmail = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? 'admin@localhost'
  await sendMail({
    to: ownerEmail,
    subject: `New order ${orderId.slice(0, 8)} - ${formatMmk(total)}`,
    react: NewOrderAlert({
      orderId,
      total: formatMmk(total),
      method: method.name,
      customer: session.user.email ?? userId,
    }),
  }).catch(() => {})

  // Telegram is a third party. The alert is a nudge to go look at the order, so
  // it carries the reference and a masked address - never the address itself.
  // The full details are in the owner's own inbox via NewOrderAlert above.
  await sendTelegram(
    `🆕 New order ${orderId.slice(0, 8)}\nMethod: ${method.name}\nTotal: ${formatMmk(total)}\nCustomer: ${
      session.user.email ? maskEmail(session.user.email) : '****'
    }`,
  )

  return ok({ orderId })
}

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.placedAt))
  return ok(rows)
}
