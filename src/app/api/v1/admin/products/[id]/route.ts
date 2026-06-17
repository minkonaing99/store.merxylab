import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { products, productSpecs } from '@/db/schema/products'
import { orderItems } from '@/db/schema/orders'
import { requireAdmin } from '@/lib/admin-guard'
import { deletePublic } from '@/lib/r2'
import { revalidateTag } from 'next/cache'

const SLUG_RE = /^[a-z0-9-]+$/

const specSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(200),
})

const patchSchema = z
  .object({
    name: z.string().min(1).max(120),
    tagline: z.string().min(1).max(200),
    description: z.string().min(1).max(8000),
    categoryId: z.string().min(1).max(32),
    priceMmk: z.number().int().min(0).max(999_999_999),
    swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    stockQty: z.number().int().min(0).max(100_000),
    lowStockThreshold: z.number().int().min(0).max(100),
    isActive: z.boolean(),
    featured: z.boolean(),
    sortOrder: z.number().int().min(0).max(100_000),
    hasPhotos: z.boolean(),
    specs: z.array(specSchema).max(40),
  })
  .partial()

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
  if (!SLUG_RE.test(id)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid id.', status: 400 } },
      { status: 400 },
    )
  }
  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid body.', status: 400 } },
      { status: 400 },
    )
  }

  const { specs, ...fields } = parsed.data

  await db.transaction(async (tx) => {
    if (Object.keys(fields).length > 0) {
      await tx.update(products).set(fields).where(eq(products.id, id))
    }
    if (specs !== undefined) {
      await tx.delete(productSpecs).where(eq(productSpecs.productId, id))
      if (specs.length > 0) {
        await tx.insert(productSpecs).values(
          specs.map((s, i) => ({
            productId: id,
            label: s.label,
            value: s.value,
            sortOrder: i,
          })),
        )
      }
    }
  })

  revalidateTag('products')
  return NextResponse.json({ data: { ok: true }, error: null })
}

export async function DELETE(
  _req: Request,
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
  if (!SLUG_RE.test(id)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid id.', status: 400 } },
      { status: 400 },
    )
  }

  const [row] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, id))
    .limit(1)
  if (!row) {
    return NextResponse.json(
      { data: null, error: { code: 'NOT_FOUND', message: 'Product not found.', status: 404 } },
      { status: 404 },
    )
  }

  // Refuse hard-delete when any order references this product - orders
  // need to keep their referential history intact. Admin should flip
  // is_active = false instead (soft delete; hides from /shop, preserves
  // order rows).
  const [refOrder] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(eq(orderItems.productId, id))
    .limit(1)
  if (refOrder) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'CONFLICT',
          message:
            'Product is referenced by existing orders. Toggle "Active" off to hide it instead.',
          status: 409,
        },
      },
      { status: 409 },
    )
  }

  // Safe to hard-delete. FK cascades will clean product_specs, reviews,
  // cart_items, wishlists. R2 objects (hero + thumb for each slot) are
  // not cascaded - drop them best-effort. revalidate the catalog cache.
  await db.delete(products).where(eq(products.id, id))

  const slug = row.slug
  const slots = ['01', '02', '03', '04']
  await Promise.allSettled(
    slots.flatMap((s) => [
      deletePublic(`products/${slug}/${s}.webp`),
      deletePublic(`products/${slug}/${s}-thumb.webp`),
    ]),
  )

  revalidateTag('products')
  return NextResponse.json({ data: { ok: true }, error: null })
}
