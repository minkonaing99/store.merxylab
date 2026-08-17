import { describe, expect, it } from 'vitest'
import { maskEmail } from './mask'

describe('maskEmail', () => {
  it('keeps the first two and last two characters', () => {
    expect(maskEmail('minkonaing@gmail.com')).toBe('mi****om')
  })

  it('hides the domain, so an address cannot be reconstructed', () => {
    const masked = maskEmail('buyer@merxylab.com')
    expect(masked).not.toContain('@')
    expect(masked).not.toContain('merxylab')
  })

  it('uses a fixed-width mask so the address length does not leak', () => {
    expect(maskEmail('a.very.long.address@example.com')).toBe('a.****om')
    expect(maskEmail('short@ex.co')).toBe('sh****co')
  })

  it('reveals nothing for an address too short to mask meaningfully', () => {
    expect(maskEmail('a@b.c')).toBe('****')
    expect(maskEmail('ab')).toBe('****')
    expect(maskEmail('')).toBe('****')
  })

  it('ignores surrounding whitespace', () => {
    expect(maskEmail('  buyer@example.com  ')).toBe('bu****om')
  })

  it('is stable, so the owner can match repeat alerts from one customer', () => {
    expect(maskEmail('buyer@example.com')).toBe(maskEmail('buyer@example.com'))
  })
})
