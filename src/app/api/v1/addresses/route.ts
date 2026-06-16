import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { addresses } from '@/db/schema/addresses'
import { auth } from '@/lib/auth'

const PHONE_REGEX = /^\+959\d{7,9}$/

const addressSchema = z.object({
  label: z.string().min(1).max(40),
  recipient: z.string().min(1).max(120),
  phone: z.string().regex(PHONE_REGEX, 'Phone must be +959XXXXXXXXX').max(20),
  divisionId: z.string().min(1).max(40),
  city: z.string().min(1).max(120),
  township: z.string().min(1).max(120),
  street: z.string().min(1).max(200),
  landmark: z.string().max(200).optional().nullable(),
  isDefault: z.boolean().optional().default(false),
})

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }
  const rows = await db.select().from(addresses).where(eq(addresses.userId, session.user.id))
  return NextResponse.json({ data: rows, error: null })
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHENTICATED', message: 'Sign in required.', status: 401 } },
      { status: 401 },
    )
  }

  const raw = await req.json().catch(() => null)
  const parsed = addressSchema.safeParse(raw)
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

  const id = randomUUID()
  await db.insert(addresses).values({
    id,
    userId: session.user.id,
    label: parsed.data.label,
    recipient: parsed.data.recipient,
    phone: parsed.data.phone,
    divisionId: parsed.data.divisionId,
    city: parsed.data.city,
    township: parsed.data.township,
    street: parsed.data.street,
    landmark: parsed.data.landmark ?? null,
    isDefault: parsed.data.isDefault,
  })
  return NextResponse.json({ data: { id }, error: null })
}
