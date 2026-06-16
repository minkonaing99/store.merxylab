import { NextResponse } from 'next/server'
import { getAllCategories } from '@/lib/catalog'

export const dynamic = "force-dynamic"


export async function GET(): Promise<NextResponse> {
  const data = await getAllCategories()
  return NextResponse.json({ data, error: null })
}
