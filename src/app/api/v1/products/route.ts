import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAllProducts, getProductsByCategory } from '@/lib/catalog'
import type { CategoryId } from '@/lib/types'

export const dynamic = "force-dynamic"


const querySchema = z.object({
  category: z
    .enum(['keyboards', 'mice', 'headsets', 'microphones', 'speakers', 'accessories'])
    .optional(),
})

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    category: url.searchParams.get('category') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query.', status: 400 },
      },
      { status: 400 },
    )
  }

  const data = parsed.data.category
    ? await getProductsByCategory(parsed.data.category as CategoryId)
    : await getAllProducts()

  return NextResponse.json({ data, error: null })
}
