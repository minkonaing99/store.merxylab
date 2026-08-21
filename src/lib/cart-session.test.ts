import { beforeEach, describe, expect, it, vi } from 'vitest'

const SID = 'guest-session-cookie'
const USER_ID = 'u1'

let cookie: string | undefined = SID
/** One entry per `tx.select()` inside the transaction, in order. */
let txSelects: unknown[][] = []

const txUpdates: unknown[] = []
const txInserts: unknown[] = []
let txDeletes = 0
/** Makes the next `tx.update()` throw, standing in for a write that fails. */
let failNextUpdate = false
/** Writes made straight on `db`, bypassing the transaction. Should stay empty. */
const looseWrites: string[] = []

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (cookie ? { name, value: cookie } : undefined) }),
}))

vi.mock('./auth', () => ({ auth: async () => null }))

vi.mock('@/db', () => {
  // Drizzle's builder is both chainable and awaitable, so every step returns
  // the same object and that object is a thenable.
  function chain(result: unknown, onSet?: (patch: unknown) => void) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => c,
      limit: () => c,
      set: (patch: unknown) => {
        onSet?.(patch)
        return c
      },
      values: (v: unknown) => {
        txInserts.push(v)
        return c
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  const tx = {
    select: () => chain(txSelects.shift() ?? []),
    update: () => {
      if (failNextUpdate) throw new Error('write failed')
      return chain([], (p) => txUpdates.push(p))
    },
    insert: () => chain([]),
    delete: () => {
      txDeletes += 1
      return chain([])
    },
  }
  return {
    db: {
      select: () => chain([]),
      update: () => {
        looseWrites.push('update')
        return chain([])
      },
      insert: () => {
        looseWrites.push('insert')
        return chain([])
      },
      delete: () => {
        looseWrites.push('delete')
        return chain([])
      },
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
    },
  }
})

const { mergeGuestCartToUser } = await import('./cart-session')

beforeEach(() => {
  cookie = SID
  txSelects = []
  txUpdates.length = 0
  txInserts.length = 0
  txDeletes = 0
  failNextUpdate = false
  looseWrites.length = 0
})

describe('mergeGuestCartToUser', () => {
  it('does nothing without a user', async () => {
    await mergeGuestCartToUser('')

    expect(txUpdates).toEqual([])
    expect(looseWrites).toEqual([])
  })

  it('does nothing when the browser carries no guest cookie', async () => {
    cookie = undefined

    await mergeGuestCartToUser(USER_ID)

    expect(txUpdates).toEqual([])
    expect(looseWrites).toEqual([])
  })

  it('writes nothing when the cookie maps to no guest cart', async () => {
    txSelects = [[]]

    await mergeGuestCartToUser(USER_ID)

    expect(txUpdates).toEqual([])
    expect(txInserts).toEqual([])
    expect(txDeletes).toBe(0)
  })

  it('promotes the guest cart when the account has none, rather than copying rows', async () => {
    txSelects = [
      [{ id: 'guest-cart', sessionId: SID, userId: null }],
      [], // no user cart
    ]

    await mergeGuestCartToUser(USER_ID)

    expect(txUpdates).toEqual([{ userId: USER_ID, sessionId: null }])
    expect(txInserts).toEqual([])
    expect(txDeletes).toBe(0)
  })

  it('sums quantities for a product both carts hold, and drops the guest cart', async () => {
    txSelects = [
      [{ id: 'guest-cart', sessionId: SID, userId: null }],
      [{ id: 'user-cart', sessionId: null, userId: USER_ID }],
      [{ cartId: 'guest-cart', productId: 'keychron-k2-pro', qty: 2 }],
      [{ cartId: 'user-cart', productId: 'keychron-k2-pro', qty: 3 }],
    ]

    await mergeGuestCartToUser(USER_ID)

    expect(txUpdates).toEqual([{ qty: 5 }])
    expect(txInserts).toEqual([])
    expect(txDeletes).toBe(1)
  })

  it('carries over a product the account does not have yet', async () => {
    txSelects = [
      [{ id: 'guest-cart', sessionId: SID, userId: null }],
      [{ id: 'user-cart', sessionId: null, userId: USER_ID }],
      [{ cartId: 'guest-cart', productId: 'premium-deskmat', qty: 2 }],
      [], // user cart empty
    ]

    await mergeGuestCartToUser(USER_ID)

    expect(txInserts).toEqual([
      { cartId: 'user-cart', productId: 'premium-deskmat', qty: 2 },
    ])
    expect(txDeletes).toBe(1)
  })

  it('caps a summed quantity at the per-line maximum', async () => {
    txSelects = [
      [{ id: 'guest-cart', sessionId: SID, userId: null }],
      [{ id: 'user-cart', sessionId: null, userId: USER_ID }],
      [{ cartId: 'guest-cart', productId: 'keychron-k2-pro', qty: 60 }],
      [{ cartId: 'user-cart', productId: 'keychron-k2-pro', qty: 60 }],
    ]

    await mergeGuestCartToUser(USER_ID)

    expect(txUpdates).toEqual([{ qty: 99 }])
  })

  /*
   * The merge is a read, a fan of per-item writes and a delete. Run loose, a
   * failure part-way leaves the guest cart undeleted with some of its rows
   * already folded in - and the retry sums those quantities a second time.
   *
   * This asserts the routing only: every write goes through the transaction
   * handle rather than straight at `db`. The rollback itself is drizzle's, and
   * a mock with no rollback to perform cannot demonstrate it.
   */
  it('routes every write through the transaction handle, never straight at db', async () => {
    txSelects = [
      [{ id: 'guest-cart', sessionId: SID, userId: null }],
      [{ id: 'user-cart', sessionId: null, userId: USER_ID }],
      [
        { cartId: 'guest-cart', productId: 'keychron-k2-pro', qty: 1 },
        { cartId: 'guest-cart', productId: 'premium-deskmat', qty: 1 },
      ],
      [{ cartId: 'user-cart', productId: 'keychron-k2-pro', qty: 1 }],
    ]

    await mergeGuestCartToUser(USER_ID)

    expect(looseWrites).toEqual([])
    expect(txUpdates).toEqual([{ qty: 2 }])
    expect(txInserts).toEqual([
      { cartId: 'user-cart', productId: 'premium-deskmat', qty: 1 },
    ])
    expect(txDeletes).toBe(1)
  })

  /*
   * Swallowing a mid-merge error would commit the half-done state, which is
   * the thing the transaction exists to prevent. The failure has to reach
   * drizzle for drizzle to roll anything back.
   */
  it('lets a failed write escape, so the transaction can be rolled back', async () => {
    txSelects = [
      [{ id: 'guest-cart', sessionId: SID, userId: null }],
      [{ id: 'user-cart', sessionId: null, userId: USER_ID }],
      [{ cartId: 'guest-cart', productId: 'keychron-k2-pro', qty: 1 }],
      [{ cartId: 'user-cart', productId: 'keychron-k2-pro', qty: 1 }],
    ]
    failNextUpdate = true

    await expect(mergeGuestCartToUser(USER_ID)).rejects.toThrow('write failed')
    expect(txDeletes).toBe(0)
  })
})
