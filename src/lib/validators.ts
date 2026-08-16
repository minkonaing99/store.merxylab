/**
 * Shared client + server-side validators. Mirrors the zod schemas used at API
 * boundaries so the UI can flag mistakes without a round-trip.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+959\d{7,9}$/

export function isEmail(v: string): boolean {
  return EMAIL_REGEX.test(v.trim())
}

function isMyanmarPhone(v: string): boolean {
  return PHONE_REGEX.test(v.trim())
}

/** Country code shown as a fixed prefix beside the phone input. */
export const PHONE_PREFIX = '+95'

/**
 * Turns whatever a customer types after the `+95` prefix into the national
 * part of a Myanmar mobile number: digits only, no leading zero, and with a
 * pasted country code stripped.
 *
 * '09787753307' -> '9787753307'   '+95 9 787 753 307' -> '9787753307'
 */
export function normalizePhoneLocal(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('95')) digits = digits.slice(2)
  digits = digits.replace(/^0+/, '')
  return digits.slice(0, 11)
}

/** National part -> stored E.164 form. */
export function toE164Phone(local: string): string {
  return `${PHONE_PREFIX}${normalizePhoneLocal(local)}`
}

export function isPhoneLocal(local: string): boolean {
  return isMyanmarPhone(toE164Phone(local))
}

export const PHONE_HINT = 'Mobile number starting with 9, e.g. 9 787 753 307.'

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
