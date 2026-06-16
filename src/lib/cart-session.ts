import 'server-only'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { carts, cartItems } from '@/db/schema/carts'
import { products } from '@/db/schema/products'
import { auth } from './auth'
import { clampQty } from './utils'
import { QTY_MAX, QTY_MIN } from './types'

const COOKIE_NAME = 'mxl_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export interface CartLine {
  productId: string
  qty: number
  product: {
    id: string
    slug: string
    name: string
    tagline: string
    priceMmk: number
    swatch: string
    hasPhotos: boolean
    stockQty: number
  }
}

async function getOrCreateSessionId(): Promise<string> {
  const jar = await cookies()
  const existing = jar.get(COOKIE_NAME)?.value
  if (existing) return existing
  const id = randomUUID()
  jar.set({
    name: COOKIE_NAME,
    value: id,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return id
}

async function getOrCreateCart(): Promise<{ cartId: string; userId: string | null }> {
  const session = await auth()
  const userId = session?.user?.id ?? null

  if (userId) {
    const [existing] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1)
    if (existing) return { cartId: existing.id, userId }
    const id = randomUUID()
    await db.insert(carts).values({ id, userId, sessionId: null })
    return { cartId: id, userId }
  }

  const sid = await getOrCreateSessionId()
  const [existing] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.sessionId, sid), isNull(carts.userId)))
    .limit(1)
  if (existing) return { cartId: existing.id, userId: null }
  const id = randomUUID()
  await db.insert(carts).values({ id, userId: null, sessionId: sid })
  return { cartId: id, userId: null }
}

export async function getCartLines(): Promise<CartLine[]> {
  const { cartId } = await getOrCreateCart()

  const rows = await db
    .select({
      productId: cartItems.productId,
      qty: cartItems.qty,
      id: products.id,
      slug: products.slug,
      name: products.name,
      tagline: products.tagline,
      priceMmk: products.priceMmk,
      swatch: products.swatch,
      hasPhotos: products.hasPhotos,
      stockQty: products.stockQty,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.cartId, cartId))

  return rows.map((r) => ({
    productId: r.productId,
    qty: r.qty,
    product: {
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      priceMmk: Number(r.priceMmk),
      swatch: r.swatch,
      hasPhotos: Boolean(r.hasPhotos),
      stockQty: r.stockQty,
    },
  }))
}

export async function addCartItem(productId: string, qty: number): Promise<void> {
  const { cartId } = await getOrCreateCart()
  const safeQty = clampQty(qty, QTY_MIN, QTY_MAX)

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    .limit(1)

  if (existing) {
    const next = clampQty(existing.qty + safeQty, QTY_MIN, QTY_MAX)
    await db
      .update(cartItems)
      .set({ qty: next })
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    return
  }

  await db.insert(cartItems).values({ cartId, productId, qty: safeQty })
}

export async function setCartItemQty(productId: string, qty: number): Promise<void> {
  const { cartId } = await getOrCreateCart()

  if (qty <= 0) {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    return
  }

  const safeQty = clampQty(qty, QTY_MIN, QTY_MAX)
  await db
    .update(cartItems)
    .set({ qty: safeQty })
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
}

export async function removeCartItem(productId: string): Promise<void> {
  const { cartId } = await getOrCreateCart()
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
}

export async function clearCart(): Promise<void> {
  const { cartId } = await getOrCreateCart()
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId))
}

export async function mergeGuestCartToUser(): Promise<void> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return

  const jar = await cookies()
  const sid = jar.get(COOKIE_NAME)?.value
  if (!sid) return

  const [guestCart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.sessionId, sid), isNull(carts.userId)))
    .limit(1)
  if (!guestCart) return

  const [userCart] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1)

  if (!userCart) {
    // promote guest cart to user cart
    await db.update(carts).set({ userId, sessionId: null }).where(eq(carts.id, guestCart.id))
    return
  }

  // merge: sum qty per productId, cap at QTY_MAX
  const guestItems = await db.select().from(cartItems).where(eq(cartItems.cartId, guestCart.id))
  const userItems = await db.select().from(cartItems).where(eq(cartItems.cartId, userCart.id))
  const userMap = new Map(userItems.map((i) => [i.productId, i.qty]))

  for (const g of guestItems) {
    const current = userMap.get(g.productId) ?? 0
    const next = clampQty(current + g.qty, QTY_MIN, QTY_MAX)
    if (current > 0) {
      await db
        .update(cartItems)
        .set({ qty: next })
        .where(and(eq(cartItems.cartId, userCart.id), eq(cartItems.productId, g.productId)))
    } else {
      await db.insert(cartItems).values({ cartId: userCart.id, productId: g.productId, qty: next })
    }
  }

  await db.delete(carts).where(eq(carts.id, guestCart.id))
}
