'use client'

import { useEffect } from 'react'
import { useCart } from '@/lib/cart-store'

export function CartHydrator() {
  const fetchCart = useCart((s) => s.fetch)
  useEffect(() => {
    fetchCart()
  }, [fetchCart])
  return null
}
