'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useWishlist } from '@/lib/wishlist-store'

export function WishlistHydrator() {
  const session = useSession()
  const fetchList = useWishlist((s) => s.fetch)
  const mergeOnLogin = useWishlist((s) => s.mergeOnLogin)
  const hydrated = useWishlist((s) => s.hydrated)
  const wasAuthed = useWishlist((s) => s.authed)

  useEffect(() => {
    const authed = session.status === 'authenticated'
    if (session.status === 'loading') return
    if (!hydrated) {
      fetchList(authed)
      return
    }
    if (authed && !wasAuthed) {
      mergeOnLogin()
    } else if (!authed && wasAuthed) {
      fetchList(false)
    }
  }, [session.status, hydrated, wasAuthed, fetchList, mergeOnLogin])

  return null
}
