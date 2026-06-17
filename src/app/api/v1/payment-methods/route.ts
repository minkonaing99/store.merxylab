import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { paymentMethods } from '@/db/schema/payment-methods'
import { r2PublicUrl } from '@/lib/cdn'

export const dynamic = "force-dynamic"


export async function GET(): Promise<NextResponse> {
  const rows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(asc(paymentMethods.sortOrder))

  const complete = rows.filter((m) => {
    if (m.kind === 'cod') return true
    // QR optional. Account name + phone/number are the minimum required
    // for a wallet/bank method to be usable.
    return Boolean(m.accountName && m.accountPhone)
  })

  return NextResponse.json({
    data: complete.map((m) => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      accountName: m.accountName,
      accountPhone: m.accountPhone,
      qrImageUrl: r2PublicUrl(m.qrImageUrl),
      instructionsMd: m.instructionsMd,
    })),
    error: null,
  })
}
