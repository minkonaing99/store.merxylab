import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
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

export async function POST(req: Request): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  const limit = rateLimit({ key: clientKey(req, 'admin:why-image'), limit: 20, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed) {
    return rateLimited('Too many uploads.', limit.retryAfterSeconds)
  }

  const form = await req.formData().catch(() => null)
  if (!form) return fail('VALIDATION_ERROR', 'Invalid form data.', 400)
  const file = form.get('image')
  if (!(file instanceof File)) return fail('VALIDATION_ERROR', 'Missing image file.', 400)
  if (file.size > MAX_BYTES) return fail('VALIDATION_ERROR', 'File over 10 MB.', 413)
  if (!ALLOWED_MIME.has(file.type)) return fail('VALIDATION_ERROR', 'Use JPG, PNG, or WEBP.', 415)

  const buffer = Buffer.from(await file.arrayBuffer())
  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 })
      .toBuffer()
  } catch {
    return fail('VALIDATION_ERROR', 'Could not read image.', 400)
  }

  try {
    await putPublic(WHY_KEY, processed, 'image/webp')
  } catch {
    return fail('UPSTREAM_ERROR', 'Could not store image.', 502)
  }

  await setSetting(SETTING_KEY, WHY_KEY)
  revalidateTag('site-settings')

  return ok({ url: r2PublicUrl(WHY_KEY) })
}

export async function GET(): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  const key = await getSetting(SETTING_KEY)
  return ok({ url: key ? r2PublicUrl(key) : null })
}

export async function DELETE(): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  await deletePublic(WHY_KEY)
  await deleteSetting(SETTING_KEY)
  revalidateTag('site-settings')

  return ok({ ok: true })
}
