import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { paymentMethods } from '@/db/schema/payment-methods'

export async function GET(): Promise<NextResponse> {
  const rows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(asc(paymentMethods.sortOrder))

  const complete = rows.filter((m) => {
    if (m.kind === 'cod') return true
    return Boolean(m.accountName && m.accountPhone && m.qrImageUrl)
  })

  return NextResponse.json({
    data: complete.map((m) => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      accountName: m.accountName,
      accountPhone: m.accountPhone,
      qrImageUrl: m.qrImageUrl,
      instructionsMd: m.instructionsMd,
    })),
    error: null,
  })
}
