import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, generateNonce } from './csp'

function directive(policy: string, name: string): string {
  return policy.split('; ').find((d) => d.startsWith(`${name} `)) ?? ''
}

describe('contentSecurityPolicy', () => {
  it('never allows inline script when a nonce is supplied', () => {
    const script = directive(contentSecurityPolicy('abc123'), 'script-src')
    expect(script).toContain("'nonce-abc123'")
    expect(script).toContain("'strict-dynamic'")
    expect(script).not.toContain("'unsafe-inline'")
    expect(script).not.toContain("'unsafe-eval'")
  })

  it('falls back to inline script only when there is no nonce', () => {
    const script = directive(contentSecurityPolicy(null), 'script-src')
    expect(script).toContain("'unsafe-inline'")
  })

  it('keeps the directives that blunt an injection even if one lands', () => {
    const policy = contentSecurityPolicy('abc123')
    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'self'")
    expect(policy).toContain("form-action 'self'")
    expect(policy).toContain("frame-ancestors 'none'")
  })

  it('still permits inline style, which cannot execute', () => {
    expect(directive(contentSecurityPolicy('abc123'), 'style-src')).toContain("'unsafe-inline'")
  })

  it('emits one entry per directive', () => {
    const names = contentSecurityPolicy('abc123')
      .split('; ')
      .map((d) => d.split(' ')[0])
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('generateNonce', () => {
  it('is unique per call', () => {
    const nonces = new Set(Array.from({ length: 100 }, generateNonce))
    expect(nonces.size).toBe(100)
  })

  it('produces a value that survives a header round-trip unquoted', () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/=]+$/)
  })
})
