import { NextResponse } from 'next/server'

/**
 * The one JSON envelope every /api/v1 route answers with: `{ data, error }`,
 * where exactly one side is null.
 */
export function ok<T>(data: T): NextResponse {
  return NextResponse.json({ data, error: null })
}

export function fail(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ data: null, error: { code, message, status } }, { status })
}

/** 429 with the `Retry-After` header clients need to back off correctly. */
export function rateLimited(message: string, retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { data: null, error: { code: 'RATE_LIMITED', message, status: 429 } },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}
