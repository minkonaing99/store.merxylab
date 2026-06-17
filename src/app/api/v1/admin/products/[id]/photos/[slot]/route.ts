import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import sharp from 'sharp'
import { db } from '@/db'
import { products } from '@/db/schema/products'
import { requireAdmin } from '@/lib/admin-guard'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { deletePublic, putPublic, r2PublicUrl } from '@/lib/r2'

const SLUG_RE = /^[a-z0-9-]+$/
const SLOT_RE = /^0[1-4]$/
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ data: null, error: { code, message, status } }, { status })
}

interface RouteCtx {
  params: Promise<{ id: string; slot: string }>
}

async function loadSlug(id: string): Promise<string | null> {
  const [row] = await db.select({ slug: products.slug }).from(products).where(eq(products.id, id)).limit(1)
  return row?.slug ?? null
}

function heroKey(slug: string, slot: string): string {
  return `products/${slug}/${slot}.webp`
}

function thumbKey(slug: string, slot: string): string {
  return `products/${slug}/${slot}-thumb.webp`
}

export async function POST(req: Request, { params }: RouteCtx): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return jsonError('FORBIDDEN', guard.message, guard.status)

  const { id, slot } = await params
  if (!SLUG_RE.test(id)) return jsonError('VALIDATION_ERROR', 'Invalid product id.', 400)
  if (!SLOT_RE.test(slot)) return jsonError('VALIDATION_ERROR', 'Slot must be 01..04.', 400)

  const limit = rateLimit({
    key: clientKey(req, 'admin:photos'),
    limit: 30,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMITED', message: 'Too many uploads.', status: 429 } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const slug = await loadSlug(id)
  if (!slug) return jsonError('NOT_FOUND', 'Product not found.', 404)

  const form = await req.formData().catch(() => null)
  if (!form) return jsonError('VALIDATION_ERROR', 'Invalid form data.', 400)
  const file = form.get('photo')
  if (!(file instanceof File)) return jsonError('VALIDATION_ERROR', 'Missing photo file.', 400)
  if (file.size > MAX_BYTES) return jsonError('VALIDATION_ERROR', 'File over 10 MB.', 413)
  if (!ALLOWED_MIME.has(file.type)) {
    return jsonError('VALIDATION_ERROR', 'Use JPG, PNG, or WEBP.', 415)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let hero: Buffer
  let thumb: Buffer
  try {
    const base = sharp(buffer).rotate()
    hero = await base
      .clone()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86, alphaQuality: 100 })
      .toBuffer()
    thumb = await base
      .clone()
      .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, alphaQuality: 100 })
      .toBuffer()
  } catch {
    return jsonError('VALIDATION_ERROR', 'Could not read image.', 400)
  }

  const hKey = heroKey(slug, slot)
  const tKey = thumbKey(slug, slot)
  try {
    await Promise.all([
      putPublic(hKey, hero, 'image/webp'),
      putPublic(tKey, thumb, 'image/webp'),
    ])
  } catch {
    await Promise.allSettled([deletePublic(hKey), deletePublic(tKey)])
    return jsonError('UPSTREAM_ERROR', 'Could not store photo.', 502)
  }

  if (slot === '01') {
    await db.update(products).set({ hasPhotos: true }).where(eq(products.slug, slug))
  }
  revalidateTag('products')

  return NextResponse.json({
    data: {
      slot,
      heroUrl: r2PublicUrl(hKey),
      thumbUrl: r2PublicUrl(tKey),
    },
    error: null,
  })
}

export async function DELETE(_req: Request, { params }: RouteCtx): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return jsonError('FORBIDDEN', guard.message, guard.status)

  const { id, slot } = await params
  if (!SLUG_RE.test(id)) return jsonError('VALIDATION_ERROR', 'Invalid product id.', 400)
  if (!SLOT_RE.test(slot)) return jsonError('VALIDATION_ERROR', 'Slot must be 01..04.', 400)

  const slug = await loadSlug(id)
  if (!slug) return jsonError('NOT_FOUND', 'Product not found.', 404)

  await Promise.allSettled([
    deletePublic(heroKey(slug, slot)),
    deletePublic(thumbKey(slug, slot)),
  ])

  if (slot === '01') {
    await db.update(products).set({ hasPhotos: false }).where(eq(products.slug, slug))
  }
  revalidateTag('products')

  return NextResponse.json({ data: { ok: true }, error: null })
}
