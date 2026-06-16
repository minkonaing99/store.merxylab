import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { divisions } from '@/db/schema/divisions'
import { requireAdmin } from '@/lib/admin-guard'

const ID_RE = /^[a-z_]+$/i

const patchSchema = z
  .object({
    deliveryFeeMmk: z.number().int().min(0).max(1_000_000),
    codAllowed: z.boolean(),
    isBlocked: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
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
  await db.update(divisions).set(parsed.data).where(eq(divisions.id, id))
  return NextResponse.json({ data: { ok: true }, error: null })
}
