import type { NextResponse } from 'next/server'
import { auth } from './auth'
import { fail } from './api-response'

/** The refusal response when the caller is not an admin, or null when they are. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth()
  if (!session?.user?.id) return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  if (session.user.role !== 'admin') return fail('FORBIDDEN', 'Admin only.', 403)
  return null
}
