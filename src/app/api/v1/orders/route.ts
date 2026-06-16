import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderItems } from '@/db/schema/orders'
import { products } from '@/db/schema/products'
import { addresses } from '@/db/schema/addresses'
import { divisions } from '@/db/schema/divisions'
import { paymentMethods } from '@/db/schema/payment-methods'
import { auth } from '@/lib/auth'
import { getCartLines, clearCart } from '@/lib/cart-session'
import { sendMail } from '@/lib/mail'
import { formatMmk } from '@/lib/money'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { sendTelegram } from '@/lib/telegram'
import { OrderPlaced } from '@emails/order-placed'
import { NewOrderAlert } from '@emails/new-order-alert'
import { LowStockAlert } from '@emails/low-stock-alert'

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

const LOW_STOCK_DEFAULT = 3

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }
  const userId = session.user.id

  const limit = rateLimit({
    key: clientKey(req, `orders:${userId}`),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMITED', message: 'Too many orders.', status: 429 } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid body.',
          status: 400,
        },
      },
      { status: 400 },
    )
  }

  let shippingAddressId: string
  let divisionId: string

  if (parsed.data.shippingAddressId) {
    const [addr] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, parsed.data.shippingAddressId), eq(addresses.userId, userId)))
      .limit(1)
    if (!addr) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Address not found.', status: 404 } },
        { status: 404 },
      )
    }
    shippingAddressId = addr.id
    divisionId = addr.divisionId
  } else if (parsed.data.newAddress) {
    const na = parsed.data.newAddress
    divisionId = na.divisionId
    shippingAddressId = randomUUID()
    await db.insert(addresses).values({
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
    })
  } else {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Missing address.', status: 400 } },
      { status: 400 },
    )
  }

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1)
  if (!division || division.isBlocked) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Delivery to that division is unavailable.', status: 400 },
      },
      { status: 400 },
    )
  }

  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, parsed.data.paymentMethodId), eq(paymentMethods.isActive, true)))
    .limit(1)
  if (!method) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Payment method unavailable.', status: 400 },
      },
      { status: 400 },
    )
  }

  const lines = await getCartLines()
  if (lines.length === 0) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Cart is empty.', status: 400 } },
      { status: 400 },
    )
  }

  const subtotal = lines.reduce((sum, l) => sum + l.product.priceMmk * l.qty, 0)
  const deliveryFee = division.deliveryFeeMmk
  const total = subtotal + deliveryFee

  if (method.kind === 'cod') {
    if (!division.codAllowed || total > COD_CAP_MMK) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Cash on Delivery available only for Yangon/Mandalay orders under ${formatMmk(COD_CAP_MMK)}.`,
            status: 400,
          },
        },
        { status: 400 },
      )
    }
  }

  const orderId = randomUUID()
  const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MS)
  const lowStockBreaches: { id: string; remaining: number; name: string }[] = []

  try {
    await db.transaction(async (tx) => {
      for (const l of lines) {
        const res = await tx
          .update(products)
          .set({ stockQty: sql`${products.stockQty} - ${l.qty}` })
          .where(and(eq(products.id, l.productId), sql`${products.stockQty} >= ${l.qty}`))
        const affected = (res as unknown as { affectedRows?: number }).affectedRows ?? 0
        if (affected === 0) {
          throw new Error(`OUT_OF_STOCK:${l.productId}`)
        }
        const remaining = l.product.stockQty - l.qty
        if (remaining <= LOW_STOCK_DEFAULT) {
          lowStockBreaches.push({ id: l.productId, remaining, name: l.product.name })
        }
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

  await clearCart()

  await sendMail({
    to: session.user.email ?? '',
    subject: `Order ${orderId.slice(0, 8)} placed`,
    react: OrderPlaced({
      orderId,
      total: formatMmk(total),
      subtotal: formatMmk(subtotal),
      deliveryFee: formatMmk(deliveryFee),
      method: method.name,
      items: lines.map((l) => ({
        qty: l.qty,
        name: l.product.name,
        lineTotal: formatMmk(l.product.priceMmk * l.qty),
      })),
    }),
  }).catch(() => {})

  const ownerEmail = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? 'admin@localhost'
  await sendMail({
    to: ownerEmail,
    subject: `New order ${orderId.slice(0, 8)} — ${formatMmk(total)}`,
    react: NewOrderAlert({
      orderId,
      total: formatMmk(total),
      method: method.name,
      customer: session.user.email ?? userId,
    }),
  }).catch(() => {})

  await sendTelegram(
    `🆕 New order ${orderId.slice(0, 8)}\nMethod: ${method.name}\nTotal: ${formatMmk(total)}\nCustomer: ${session.user.email ?? userId}`,
  )

  for (const b of lowStockBreaches) {
    await sendMail({
      to: ownerEmail,
      subject: `Low stock: ${b.name}`,
      react: LowStockAlert({ productName: b.name, remaining: b.remaining }),
    }).catch(() => {})
  }

  return NextResponse.json({ data: { orderId }, error: null })
}

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.placedAt))
  return NextResponse.json({ data: rows, error: null })
}
