import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-guard'
import { setSetting } from '@/lib/site-settings'
import { STALE_DAYS_MAX, STALE_DAYS_MIN } from '@/lib/admin-orders'

/**
 * Narrow settings writer. Only the keys listed here can be written, each with
 * its own validator - an admin session must not turn into arbitrary writes
 * against `site_settings`.
 */
const WRITABLE = {
  orders_stale_days: z.coerce.number().int().min(STALE_DAYS_MIN).max(STALE_DAYS_MAX),
} as const

const bodySchema = z.object({
  key: z.enum(Object.keys(WRITABLE) as [keyof typeof WRITABLE]),
  value: z.union([z.string(), z.number()]),
})

export async function PATCH(req: Request): Promise<NextResponse> {
  const guard = await requireAdmin()
  if (!guard.ok) {
    return NextResponse.json(
      { data: null, error: { code: 'FORBIDDEN', message: guard.message, status: guard.status } },
      { status: guard.status },
    )
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Unknown setting.', status: 400 } },
      { status: 400 },
    )
  }

  const validated = WRITABLE[parsed.data.key].safeParse(parsed.data.value)
  if (!validated.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Value must be ${STALE_DAYS_MIN}-${STALE_DAYS_MAX}.`,
          status: 400,
        },
      },
      { status: 400 },
    )
  }

  await setSetting(parsed.data.key, String(validated.data))
  return NextResponse.json({ data: { ok: true, value: validated.data }, error: null })
}
