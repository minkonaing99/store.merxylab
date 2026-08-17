/**
 * Redaction for identifiers that leave the system - owner alerts go out over
 * Telegram's servers, and server logs are readable by anyone with host access.
 * Neither is a place for a customer's address in full.
 */

/** Fixed width, so the mask does not disclose how long the address was. */
const MASK = '****'

/**
 * `minkonaing@gmail.com` -> `mi****om`.
 *
 * Enough for the owner to recognise an address they already know, or to tell
 * two customers apart across alerts; not enough for a reader to learn one. The
 * domain goes entirely, since it is the part that makes a guess cheap.
 *
 * Addresses too short to keep four characters from are replaced outright rather
 * than half-revealed.
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim()
  if (trimmed.length <= 5) return MASK
  return `${trimmed.slice(0, 2)}${MASK}${trimmed.slice(-2)}`
}
