/**
 * Shared client + server-side validators. Mirrors the zod schemas used at API
 * boundaries so the UI can flag mistakes without a round-trip.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+959\d{7,9}$/

export function isEmail(v: string): boolean {
  return EMAIL_REGEX.test(v.trim())
}

export function isMyanmarPhone(v: string): boolean {
  return PHONE_REGEX.test(v.trim())
}

export interface PasswordCheck {
  ok: boolean
  reason?: string
}

export function checkPassword(v: string): PasswordCheck {
  if (v.length < 10) return { ok: false, reason: 'At least 10 characters.' }
  if (v.length > 200) return { ok: false, reason: 'Too long (max 200 characters).' }
  if (!/[a-z]/.test(v)) return { ok: false, reason: 'Add at least one lowercase letter.' }
  if (!/[A-Z]/.test(v)) return { ok: false, reason: 'Add at least one uppercase letter.' }
  if (!/\d/.test(v)) return { ok: false, reason: 'Add at least one digit.' }
  return { ok: true }
}

export function required(v: string, label = 'This field'): string | null {
  return v.trim().length === 0 ? `${label} is required.` : null
}

export function maxLen(v: string, max: number, label = 'This field'): string | null {
  return v.length > max ? `${label} must be ${max} characters or fewer.` : null
}
