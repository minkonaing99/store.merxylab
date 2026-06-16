import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { db } from '@/db'
import { products, productSpecs } from '@/db/schema/products'
import { requireAdmin } from '@/lib/admin-guard'

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

const specSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(200),
})

const bodySchema = z.object({
  slug: z.string().min(2).max(80).regex(SLUG_REGEX),
  name: z.string().min(1).max(120),
  categoryId: z.string().min(1).max(32),
  priceMmk: z.number().int().min(0).max(999_999_999),
  tagline: z.string().min(1).max(200),
  description: z.string().min(1).max(8000),
  swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  stockQty: z.number().int().min(0).max(100_000),
  lowStockThreshold: z.number().int().min(0).max(100),
  isActive: z.boolean(),
  featured: z.boolean(),
  specs: z.array(specSchema).max(40),
})

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: guard.message, status: guard.status } },
      { status: guard.status },
    )
  }
  const raw = await req.json().catch(() => null)
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
  const b = parsed.data

  // Slug uniqueness check (id = slug).
  const existing = await db.select({ id: products.id }).from(products).where(eq(products.id, b.slug)).limit(1)
  if (existing.length > 0) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'CONFLICT', message: 'Slug already in use.', status: 409 },
      },
      { status: 409 },
    )
  }

  await db.transaction(async (tx) => {
    await tx.insert(products).values({
      id: b.slug,
      slug: b.slug,
      name: b.name,
      categoryId: b.categoryId,
      priceMmk: b.priceMmk,
      tagline: b.tagline,
      description: b.description,
      swatch: b.swatch,
      stockQty: b.stockQty,
      lowStockThreshold: b.lowStockThreshold,
      hasPhotos: false,
      isActive: b.isActive,
      featured: b.featured,
    })
    if (b.specs.length > 0) {
      await tx.insert(productSpecs).values(
        b.specs.map((s, i) => ({
          productId: b.slug,
          label: s.label,
          value: s.value,
          sortOrder: i,
        })),
      )
    }
  })

  revalidateTag('products')

  return NextResponse.json({ data: { id: b.slug, slug: b.slug }, error: null })
}
