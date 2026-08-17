import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBuckets } from '@/lib/rate-limit'

const setCartItemQty = vi.fn(async () => {})
const removeCartItem = vi.fn(async () => {})

vi.mock('@/lib/cart-session', () => ({
  getCartLines: async () => [],
  setCartItemQty: () => setCartItemQty(),
  removeCartItem: () => removeCartItem(),
}))

const { DELETE, PATCH } = await import('./route')

function ctx(productId = 'signet-01') {
  return { params: Promise.resolve({ productId }) }
}

function req(method: string, body?: unknown, from = '10.10.0.1'): Request {
  return new Request('http://localhost/api/v1/cart/items/signet-01', {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': from },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

beforeEach(() => {
  setCartItemQty.mockClear()
  removeCartItem.mockClear()
  resetBuckets()
})

describe('cart item route', () => {
  it('updates a quantity', async () => {
    const res = await PATCH(req('PATCH', { qty: 3 }), ctx())
    expect(res.status).toBe(200)
    expect(setCartItemQty).toHaveBeenCalledOnce()
  })

  it('removes an item', async () => {
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(200)
    expect(removeCartItem).toHaveBeenCalledOnce()
  })

  it('refuses an id outside the slug shape', async () => {
    const res = await PATCH(req('PATCH', { qty: 3 }), ctx('../../products'))
    expect(res.status).toBe(400)
    expect(setCartItemQty).not.toHaveBeenCalled()
  })

  it('refuses a quantity outside the allowed range', async () => {
    for (const qty of [-1, 100, 1.5]) {
      expect((await PATCH(req('PATCH', { qty }), ctx())).status).toBe(400)
    }
  })

  it('rate limits writes, not just additions', async () => {
    // These are unauthenticated and write to the database on every call, same as
    // the sibling POST that was already limited.
    for (let i = 0; i < 60; i += 1) {
      expect((await PATCH(req('PATCH', { qty: 1 }, '10.10.5.5'), ctx())).status).toBe(200)
    }

    const blocked = await PATCH(req('PATCH', { qty: 1 }, '10.10.5.5'), ctx())
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
  })

  it('shares one budget between updating and removing', async () => {
    for (let i = 0; i < 60; i += 1) {
      await PATCH(req('PATCH', { qty: 1 }, '10.10.6.6'), ctx())
    }
    expect((await DELETE(req('DELETE', undefined, '10.10.6.6'), ctx())).status).toBe(429)
  })
})
