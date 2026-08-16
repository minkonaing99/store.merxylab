import { describe, expect, it } from 'vitest'
import {
  PHONE_PREFIX,
  checkPassword,
  isEmail,
  isPhoneLocal,
  normalizePhoneLocal,
  toE164Phone,
} from './validators'

describe('normalizePhoneLocal', () => {
  it('accepts every shape a Myanmar customer types', () => {
    const same = [
      '9787753307',
      '09787753307',
      '+95 9 787 753 307',
      '959787753307',
      '09-787-753-307',
      '(09) 787 753 307',
    ]
    for (const input of same) {
      expect(normalizePhoneLocal(input), input).toBe('9787753307')
    }
  })

  it('strips the country code only when it leads', () => {
    // A number that merely contains 95 mid-string keeps its digits.
    expect(normalizePhoneLocal('9959512345')).toBe('9959512345')
  })

  it('caps length so a paste bomb cannot reach the database', () => {
    expect(normalizePhoneLocal('9'.repeat(50))).toHaveLength(11)
  })

  it('returns empty for input with no digits', () => {
    expect(normalizePhoneLocal('')).toBe('')
    expect(normalizePhoneLocal('not a phone')).toBe('')
  })
})

describe('toE164Phone', () => {
  it('always produces the stored prefix form', () => {
    expect(toE164Phone('09787753307')).toBe('+959787753307')
    expect(toE164Phone('9787753307')).toBe('+959787753307')
  })

  it('is idempotent - re-normalising a stored value does not double the code', () => {
    const once = toE164Phone('09787753307')
    expect(toE164Phone(once)).toBe(once)
  })

  it('uses the exported prefix', () => {
    expect(toE164Phone('9787753307').startsWith(PHONE_PREFIX)).toBe(true)
  })
})

describe('isPhoneLocal', () => {
  it('accepts Myanmar mobile numbers', () => {
    expect(isPhoneLocal('9787753307')).toBe(true)
    expect(isPhoneLocal('09787753307')).toBe(true)
  })

  it('rejects numbers not starting with 9 after the country code', () => {
    expect(isPhoneLocal('787753307')).toBe(false)
  })

  it('rejects too short and too long', () => {
    expect(isPhoneLocal('91234')).toBe(false)
    expect(isPhoneLocal('9'.repeat(11))).toBe(false)
  })

  it('rejects empty', () => {
    expect(isPhoneLocal('')).toBe(false)
  })
})

describe('isEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isEmail('a@b.com')).toBe(true)
    expect(isEmail('  spaced@example.co.uk  ')).toBe(true)
  })

  it('rejects malformed input', () => {
    for (const bad of ['', 'plain', 'a@b', 'a b@c.com', '@b.com', 'a@.com']) {
      expect(isEmail(bad), bad).toBe(false)
    }
  })
})

describe('checkPassword', () => {
  it('accepts a password meeting every rule', () => {
    expect(checkPassword('Quiet0nTheDesk').ok).toBe(true)
  })

  it('rejects under 10 characters, which sign-in silently treats as wrong', () => {
    const r = checkPassword('Ab1cdef')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/10 characters/)
  })

  it('requires lowercase, uppercase and a digit', () => {
    expect(checkPassword('ALLUPPERCASE1').ok).toBe(false)
    expect(checkPassword('alllowercase1').ok).toBe(false)
    expect(checkPassword('NoDigitsHere').ok).toBe(false)
  })

  it('rejects absurd length', () => {
    expect(checkPassword(`Aa1${'x'.repeat(300)}`).ok).toBe(false)
  })
})
