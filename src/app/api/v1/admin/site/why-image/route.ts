import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { requireAdmin } from '@/lib/admin-guard'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { deletePublic, putPublic, r2PublicUrl } from '@/lib/r2'
import { getSetting, setSetting, deleteSetting } from '@/lib/site-settings'
import { revalidateTag } from 'next/cache'

const WHY_KEY = 'site/why.webp'
const SETTING_KEY = 'why_image'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ data: null, error: { code, message, status } }, { status })
}

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return jsonError('FORBIDDEN', guard.message, guard.status)

  const limit = rateLimit({ key: clientKey(req, 'admin:why-image'), limit: 20, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMITED', message: 'Too many uploads.', status: 429 } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const form = await req.formData().catch(() => null)
  if (!form) return jsonError('VALIDATION_ERROR', 'Invalid form data.', 400)
  const file = form.get('image')
  if (!(file instanceof File)) return jsonError('VALIDATION_ERROR', 'Missing image file.', 400)
  if (file.size > MAX_BYTES) return jsonError('VALIDATION_ERROR', 'File over 10 MB.', 413)
  if (!ALLOWED_MIME.has(file.type)) return jsonError('VALIDATION_ERROR', 'Use JPG, PNG, or WEBP.', 415)

  const buffer = Buffer.from(await file.arrayBuffer())
  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 })
      .toBuffer()
  } catch {
    return jsonError('VALIDATION_ERROR', 'Could not read image.', 400)
  }

  try {
    await putPublic(WHY_KEY, processed, 'image/webp')
  } catch {
    return jsonError('UPSTREAM_ERROR', 'Could not store image.', 502)
  }

  await setSetting(SETTING_KEY, WHY_KEY)
  revalidateTag('site-settings')

  return NextResponse.json({ data: { url: r2PublicUrl(WHY_KEY) }, error: null })
}

export async function GET(): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return jsonError('FORBIDDEN', guard.message, guard.status)

  const key = await getSetting(SETTING_KEY)
  return NextResponse.json({ data: { url: key ? r2PublicUrl(key) : null }, error: null })
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return jsonError('FORBIDDEN', guard.message, guard.status)

  await deletePublic(WHY_KEY)
  await deleteSetting(SETTING_KEY)
  revalidateTag('site-settings')

  return NextResponse.json({ data: { ok: true }, error: null })
}
