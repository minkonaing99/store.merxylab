import { NextResponse } from 'next/server'
import { getProductBySlug } from '@/lib/catalog'

const SLUG_RE = /^[a-z0-9-]+$/

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid slug.', status: 400 },
      },
      { status: 400 },
    )
  }

  const product = await getProductBySlug(slug)

  if (!product) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'NOT_FOUND', message: 'No product matches that slug.', status: 404 },
      },
      { status: 404 },
    )
  }

  return NextResponse.json({ data: product, error: null })
}
