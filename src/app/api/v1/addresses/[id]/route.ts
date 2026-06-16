import { NextResponse } from 'next/server'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { addresses } from '@/db/schema/addresses'
import { auth } from '@/lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PHONE_REGEX = /^\+959\d{7,9}$/

const patchSchema = z
  .object({
    label: z.string().min(1).max(40),
    recipient: z.string().min(1).max(120),
    phone: z.string().regex(PHONE_REGEX).max(20),
    divisionId: z.string().min(1).max(40),
    city: z.string().min(1).max(120),
    township: z.string().min(1).max(120),
    street: z.string().min(1).max(200),
    landmark: z.string().max(200).nullable(),
    isDefault: z.boolean(),
  })
  .partial()

async function requireSession() {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const userId = await requireSession()
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }
  const { id } = await params
  if (!UUID_RE.test(id)) {
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
  await db
    .update(addresses)
    .set(parsed.data)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
  return NextResponse.json({ data: { ok: true }, error: null })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const userId = await requireSession()
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Invalid id.', status: 400 } },
      { status: 400 },
    )
  }
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
  return NextResponse.json({ data: { ok: true }, error: null })
}
