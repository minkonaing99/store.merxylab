import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { products } from '@/db/schema/products'
import { requireAdmin } from '@/lib/admin-guard'
import { revalidateTag } from 'next/cache'

const SLUG_RE = /^[a-z0-9-]+$/

const patchSchema = z
  .object({
    name: z.string().min(1).max(120),
    tagline: z.string().min(1).max(200),
    description: z.string().min(1).max(8000),
    priceMmk: z.number().int().min(0).max(999_999_999),
    swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    stockQty: z.number().int().min(0).max(100_000),
    lowStockThreshold: z.number().int().min(0).max(100),
    isActive: z.boolean(),
    featured: z.boolean(),
    hasPhotos: z.boolean(),
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
  await db.update(products).set(parsed.data).where(eq(products.id, id))
  revalidateTag('products')
  return NextResponse.json({ data: { ok: true }, error: null })
}
