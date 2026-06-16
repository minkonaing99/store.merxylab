import { join } from 'node:path'

const ROOT = join(process.cwd(), 'private-uploads', 'slips')

export function slipDir(orderId: string): string {
  return join(ROOT, orderId)
}

export function slipPath(orderId: string, basename: string): string {
  return join(ROOT, orderId, basename)
}

// Accepts either a bare basename ("<uuid>.webp") or a legacy "/slips/<id>/<uuid>.webp"
// path. Returns just the basename, or null if invalid.
export function slipBasenameFrom(stored: string | null | undefined): string | null {
  if (!stored) return null
  const trimmed = stored.split('/').pop() ?? ''
  return /^[0-9a-f-]{36}\.webp$/i.test(trimmed) ? trimmed : null
}
