import { describe, expect, it } from 'vitest'
import { ORDER_STATUSES } from '@/db/schema/orders'
import { customerStatusHint, customerStatusLabel, type MethodKind } from './order-status'

const KINDS: MethodKind[] = ['wallet', 'cod']

describe('customerStatusLabel', () => {
  it('returns a label for every status and payment kind', () => {
    for (const kind of KINDS) {
      for (const status of ORDER_STATUSES) {
        const label = customerStatusLabel(status, kind)
        expect(label, `${kind}/${status}`).toBeTruthy()
      }
    }
  })

  it('never leaks the raw enum to a customer', () => {
    for (const kind of KINDS) {
      for (const status of ORDER_STATUSES) {
        expect(customerStatusLabel(status, kind)).not.toContain('_')
      }
    }
  })

  it('does not tell a COD buyer that payment is awaited', () => {
    // The bug this module exists to prevent: COD buyers owe nothing until the
    // courier arrives, so "Awaiting payment" made them think they must transfer.
    expect(customerStatusLabel('pending_payment', 'cod')).toBe('Awaiting confirmation')
    expect(customerStatusLabel('pending_payment', 'wallet')).toBe('Awaiting payment')
  })

  it('reminds a COD buyer to have cash ready once confirmed', () => {
    expect(customerStatusLabel('confirmed', 'cod')).toMatch(/pay on delivery/i)
    expect(customerStatusLabel('confirmed', 'wallet')).toBe('Confirmed')
  })

  it('reads the same for both kinds once the order closes', () => {
    for (const status of ['delivered', 'cancelled'] as const) {
      expect(customerStatusLabel(status, 'cod')).toBe(customerStatusLabel(status, 'wallet'))
    }
  })
})

describe('customerStatusHint', () => {
  it('tells a COD buyer to expect a call, not a transfer', () => {
    const hint = customerStatusHint('pending_payment', 'cod')
    expect(hint).toMatch(/call/i)
    expect(hint).not.toMatch(/transfer|slip/i)
  })

  it('gives a COD buyer a window for the confirmation call, not an open wait', () => {
    expect(customerStatusHint('pending_payment', 'cod')).toMatch(/within 3 hours/i)
  })

  it('tells a wallet buyer to transfer and warns about the 24h expiry', () => {
    const hint = customerStatusHint('pending_payment', 'wallet')
    expect(hint).toMatch(/slip/i)
    expect(hint).toMatch(/24 hours/i)
  })

  it('goes quiet on terminal statuses - nothing is expected of anyone', () => {
    for (const kind of KINDS) {
      expect(customerStatusHint('delivered', kind)).toBeNull()
      expect(customerStatusHint('cancelled', kind)).toBeNull()
    }
  })

  it('covers every live status', () => {
    for (const kind of KINDS) {
      for (const status of ['pending_payment', 'payment_submitted', 'confirmed'] as const) {
        expect(customerStatusHint(status, kind), `${kind}/${status}`).toBeTruthy()
      }
    }
  })
})
