interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

interface CheckOptions {
  key: string
  limit: number
  windowMs: number
}

interface CheckResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit({ key, limit, windowMs }: CheckOptions): CheckResult {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 }
}

export function clientKey(req: Request, prefix: string): string {
  const xff = req.headers.get('x-forwarded-for')
  const ip = xff?.split(',')[0]?.trim() ?? 'unknown'
  return `${prefix}:${ip}`
}
