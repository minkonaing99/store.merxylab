import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { divisions } from '@/db/schema/divisions'

export async function GET(): Promise<NextResponse> {
  const rows = await db
    .select()
    .from(divisions)
    .where(eq(divisions.isBlocked, false))
    .orderBy(asc(divisions.sortOrder))

  return NextResponse.json({
    data: rows.map((d) => ({
      id: d.id,
      name: d.name,
      deliveryFeeMmk: d.deliveryFeeMmk,
      codAllowed: d.codAllowed,
    })),
    error: null,
  })
}
