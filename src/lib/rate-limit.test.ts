import { describe, expect, it } from 'vitest'
import { clientIp } from './rate-limit'

function req(headers: Record<string, string>): Request {
  return new Request('https://merxylab.com/api/v1/orders', { headers })
}

describe('clientIp', () => {
  it('takes the entry the nearest trusted proxy appended, not the caller-supplied one', () => {
    // A proxy appends the address it saw. Everything left of that is whatever
    // the caller sent, so the rightmost hop is the only trustworthy entry.
    expect(clientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }), 1)).toBe('203.0.113.9')
  })

  it('ignores a forged chain of any length', () => {
    const forged = ['9.9.9.9', '8.8.8.8', '7.7.7.7'].join(', ')
    expect(clientIp(req({ 'x-forwarded-for': `${forged}, 203.0.113.9` }), 1)).toBe('203.0.113.9')
  })

  it('walks back further when two proxies are trusted', () => {
    expect(
      clientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9, 10.0.0.1' }), 2),
    ).toBe('203.0.113.9')
  })

  it('does not fall off the front of a short chain', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9' }), 3)).toBe('203.0.113.9')
  })

  it('ignores X-Forwarded-For entirely when no proxy is trusted', () => {
    const r = req({ 'x-forwarded-for': '9.9.9.9', 'x-real-ip': '203.0.113.9' })
    expect(clientIp(r, 0)).toBe('203.0.113.9')
  })

  it('falls back to x-real-ip when the chain is absent', () => {
    expect(clientIp(req({ 'x-real-ip': '203.0.113.9' }), 1)).toBe('203.0.113.9')
  })

  it('shares one bucket when no address can be established', () => {
    expect(clientIp(req({}), 1)).toBe('unknown')
    expect(clientIp(req({ 'x-forwarded-for': ' , ' }), 1)).toBe('unknown')
  })
})
