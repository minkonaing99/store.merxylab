import { auth } from './auth'

export async function requireAdmin(): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, status: 401, message: 'Sign in required.' }
  if (session.user.role !== 'admin') return { ok: false, status: 403, message: 'Admin only.' }
  return { ok: true }
}
