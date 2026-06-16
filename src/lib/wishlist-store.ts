'use client'

import { create } from 'zustand'

const LS_KEY = 'merxylab-wishlist'

function loadLocal(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s) => typeof s === 'string')
  } catch {
    return []
  }
}

function saveLocal(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(ids))
  } catch {
    // ignore quota
  }
}

interface WishlistStore {
  ids: Set<string>
  authed: boolean
  hydrated: boolean
  fetch: (authed: boolean) => Promise<void>
  add: (productId: string) => Promise<void>
  remove: (productId: string) => Promise<void>
  has: (productId: string) => boolean
  mergeOnLogin: () => Promise<void>
}

export const useWishlist = create<WishlistStore>((set, get) => ({
  ids: new Set(),
  authed: false,
  hydrated: false,

  async fetch(authed) {
    if (authed) {
      const res = await fetch('/api/v1/wishlist', { credentials: 'same-origin' })
      if (res.ok) {
        const json = (await res.json()) as { data: { productId: string }[] }
        set({
          ids: new Set(json.data?.map((r) => r.productId) ?? []),
          authed: true,
          hydrated: true,
        })
        return
      }
    }
    set({ ids: new Set(loadLocal()), authed: false, hydrated: true })
  },

  async add(productId) {
    const next = new Set(get().ids)
    next.add(productId)
    set({ ids: next })
    if (get().authed) {
      await fetch(`/api/v1/wishlist/${encodeURIComponent(productId)}`, {
        method: 'POST',
        credentials: 'same-origin',
      })
    } else {
      saveLocal([...next])
    }
  },

  async remove(productId) {
    const next = new Set(get().ids)
    next.delete(productId)
    set({ ids: next })
    if (get().authed) {
      await fetch(`/api/v1/wishlist/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
    } else {
      saveLocal([...next])
    }
  },

  has(productId) {
    return get().ids.has(productId)
  },

  async mergeOnLogin() {
    const local = loadLocal()
    if (local.length > 0) {
      await fetch('/api/v1/wishlist/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productIds: local }),
        credentials: 'same-origin',
      })
      saveLocal([])
    }
    await get().fetch(true)
  },
}))
