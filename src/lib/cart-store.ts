'use client'

import { create } from 'zustand'

export interface CartLine {
  productId: string
  qty: number
  product: {
    id: string
    slug: string
    name: string
    tagline: string
    priceMmk: number
    swatch: string
    hasPhotos: boolean
    stockQty: number
  }
}

interface CartStore {
  items: CartLine[]
  subtotal: number
  isOpen: boolean
  hydrated: boolean
  fetch: () => Promise<void>
  add: (productId: string, qty?: number) => Promise<void>
  setQty: (productId: string, qty: number) => Promise<void>
  remove: (productId: string) => Promise<void>
  merge: () => Promise<void>
  open: () => void
  close: () => void
  toggle: () => void
}

async function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<{ items: CartLine[]; subtotal: number } | null> {
  try {
    const res = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      data: { items: CartLine[]; subtotal: number } | null
      error: unknown
    }
    return json.data
  } catch {
    return null
  }
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  subtotal: 0,
  isOpen: false,
  hydrated: false,

  async fetch() {
    const data = await call('GET', '/api/v1/cart')
    if (data) set({ items: data.items, subtotal: data.subtotal, hydrated: true })
    else set({ hydrated: true })
  },

  async add(productId, qty = 1) {
    // optimistic open
    set({ isOpen: true })
    const data = await call('POST', '/api/v1/cart/items', { productId, qty })
    if (data) set({ items: data.items, subtotal: data.subtotal })
    else await get().fetch()
  },

  async setQty(productId, qty) {
    const data = await call('PATCH', `/api/v1/cart/items/${encodeURIComponent(productId)}`, { qty })
    if (data) set({ items: data.items, subtotal: data.subtotal })
    else await get().fetch()
  },

  async remove(productId) {
    const data = await call('DELETE', `/api/v1/cart/items/${encodeURIComponent(productId)}`)
    if (data) set({ items: data.items, subtotal: data.subtotal })
    else await get().fetch()
  },

  async merge() {
    const data = await call('POST', '/api/v1/cart/merge')
    if (data) set({ items: data.items, subtotal: data.subtotal })
    else await get().fetch()
  },

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))

export function useCartCount(): number {
  return useCart((s) => s.items.reduce((sum, i) => sum + i.qty, 0))
}

export function useCartSubtotal(): number {
  return useCart((s) => s.subtotal)
}
