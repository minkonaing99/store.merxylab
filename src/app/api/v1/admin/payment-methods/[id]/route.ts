import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { paymentMethods } from '@/db/schema/payment-methods'
import { requireAdmin } from '@/lib/admin-guard'

const ID_RE = /^[a-z0-9_]+$/i

const patchSchema = z
  .object({
    name: z.string().min(1).max(60),
    accountName: z.string().max(120).nullable(),
    accountPhone: z.string().max(20).nullable(),
    qrImageUrl: z.string().max(255).nullable(),
    instructionsMd: z.string().max(4000).nullable(),
    sortOrder: z.number().int().min(0).max(999),
    isActive: z.boolean(),
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
  if (!ID_RE.test(id)) {
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
  await db.update(paymentMethods).set(parsed.data).where(eq(paymentMethods.id, id))
  return NextResponse.json({ data: { ok: true }, error: null })
}
