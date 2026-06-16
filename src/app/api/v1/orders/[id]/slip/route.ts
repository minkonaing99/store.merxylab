import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { and, eq } from 'drizzle-orm'
import sharp from 'sharp'
import { db } from '@/db'
import { orders } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { auth } from '@/lib/auth'
import { sendMail } from '@/lib/mail'
import { sendTelegram } from '@/lib/telegram'
import { formatMmk } from '@/lib/money'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { SlipReceived } from '@emails/slip-received'
import { SlipSubmittedAlert } from '@emails/slip-submitted-alert'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 8 * 1024 * 1024

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ data: null, error: { code, message, status } }, { status })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return jsonError('UNAUTHENTICATED', 'Sign in required.', 401)
  const userId = session.user.id

  const { id } = await params
  if (!UUID_RE.test(id)) return jsonError('VALIDATION_ERROR', 'Invalid id.', 400)

  const limit = rateLimit({
    key: clientKey(req, `slip:${userId}`),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { data: null, error: { code: 'RATE_LIMITED', message: 'Too many uploads.', status: 429 } },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)))
    .limit(1)
  if (!order) return jsonError('NOT_FOUND', 'Order not found.', 404)
  if (order.status !== 'pending_payment' && order.status !== 'payment_submitted') {
    return jsonError('CONFLICT', 'Order no longer accepts slip uploads.', 409)
  }

  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.id, order.paymentMethodId))
    .limit(1)
  if (method?.kind === 'cod') {
    return jsonError('CONFLICT', 'Cash on Delivery orders do not need a slip.', 409)
  }

  const form = await req.formData().catch(() => null)
  if (!form) return jsonError('VALIDATION_ERROR', 'Invalid form data.', 400)
  const file = form.get('slip')
  const txRef = form.get('txRef')

  if (!(file instanceof File)) return jsonError('VALIDATION_ERROR', 'Missing slip file.', 400)
  if (file.size > MAX_BYTES) return jsonError('VALIDATION_ERROR', 'File over 8 MB.', 413)
  if (!ALLOWED_MIME.has(file.type)) {
    return jsonError('VALIDATION_ERROR', 'Use JPG, PNG, or WEBP.', 415)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    return jsonError('VALIDATION_ERROR', 'Could not read image.', 400)
  }

  const fileName = `${randomUUID()}.webp`
  const dir = join(process.cwd(), 'public', 'slips', id)
  await mkdir(dir, { recursive: true })

  if (order.paymentProofUrl) {
    const existing = order.paymentProofUrl.split('/').pop()
    if (existing) {
      await unlink(join(dir, existing)).catch(() => {})
    }
  }

  await writeFile(join(dir, fileName), processed)

  const publicUrl = `/slips/${id}/${fileName}`

  await db
    .update(orders)
    .set({
      status: 'payment_submitted',
      paymentProofUrl: publicUrl,
      paymentTxRef: typeof txRef === 'string' && txRef ? txRef.slice(0, 120) : null,
    })
    .where(eq(orders.id, id))

  await sendMail({
    to: session.user.email ?? '',
    subject: `Order ${id.slice(0, 8)} — slip received`,
    react: SlipReceived({ orderId: id, total: formatMmk(Number(order.totalMmk)) }),
  }).catch(() => {})

  const ownerEmail = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? 'admin@localhost'
  await sendMail({
    to: ownerEmail,
    subject: `Slip submitted: ${id.slice(0, 8)}`,
    react: SlipSubmittedAlert({
      orderId: id,
      total: formatMmk(Number(order.totalMmk)),
      method: method?.name ?? order.paymentMethodId,
    }),
  }).catch(() => {})

  await sendTelegram(
    `💳 Slip submitted for ${id.slice(0, 8)}\nMethod: ${method?.name ?? order.paymentMethodId}\nTotal: ${formatMmk(Number(order.totalMmk))}`,
  )

  return NextResponse.json({ data: { ok: true, paymentProofUrl: publicUrl }, error: null })
}
