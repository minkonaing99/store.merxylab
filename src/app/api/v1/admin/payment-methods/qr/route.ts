import { NextResponse } from 'next/server'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { paymentMethods } from '@/db/schema/payment-methods'
import { requireAdmin } from '@/lib/admin-guard'

const ID_RE = /^[a-z0-9_]+$/i
const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ data: null, error: { code, message, status } }, { status })
}

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) return jsonError('FORBIDDEN', guard.message, guard.status)

  const form = await req.formData().catch(() => null)
  if (!form) return jsonError('VALIDATION_ERROR', 'Invalid form data.', 400)

  const methodId = form.get('methodId')
  const file = form.get('qr')
  if (typeof methodId !== 'string' || !ID_RE.test(methodId)) {
    return jsonError('VALIDATION_ERROR', 'Invalid method id.', 400)
  }
  if (!(file instanceof File)) return jsonError('VALIDATION_ERROR', 'Missing QR file.', 400)
  if (file.size > MAX_BYTES) return jsonError('VALIDATION_ERROR', 'File over 4 MB.', 413)
  if (!ALLOWED_MIME.has(file.type)) {
    return jsonError('VALIDATION_ERROR', 'Use JPG, PNG, or WEBP.', 415)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .rotate()
      .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92 })
      .toBuffer()
  } catch {
    return jsonError('VALIDATION_ERROR', 'Could not read image.', 400)
  }

  const dir = join(process.cwd(), 'public', 'payment-qr')
  await mkdir(dir, { recursive: true })
  const fileName = `${methodId}.webp`

  const [existing] = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.id, methodId))
    .limit(1)
  if (existing?.qrImageUrl) {
    const prev = existing.qrImageUrl.split('/').pop()
    if (prev && prev !== fileName) {
      await unlink(join(dir, prev)).catch(() => {})
    }
  }

  await writeFile(join(dir, fileName), processed)
  const publicUrl = `/payment-qr/${fileName}`

  await db.update(paymentMethods).set({ qrImageUrl: publicUrl }).where(eq(paymentMethods.id, methodId))

  return NextResponse.json({ data: { qrImageUrl: publicUrl }, error: null })
}
