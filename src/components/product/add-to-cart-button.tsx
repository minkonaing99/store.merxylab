'use client'

import { ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-store'
import { cn } from '@/lib/utils'

interface AddToCartButtonProps {
  productId: string
  productName: string
  disabled?: boolean
}

export function AddToCartButton({ productId, productName, disabled }: AddToCartButtonProps) {
  const add = useCart((s) => s.add)

  function handle() {
    if (disabled) return
    add(productId, 1)
    toast(`Added - ${productName}`)
  }

  return (
    <button
      onClick={handle}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] px-6 py-3.5 text-[14px] font-medium transition-colors',
        disabled
          ? 'cursor-not-allowed bg-line text-muted'
          : 'bg-ink text-cream hover:bg-accent',
      )}
    >
      <ShoppingBag size={16} strokeWidth={1.75} />
      {disabled ? 'Out of stock' : 'Add to cart'}
    </button>
  )
}
