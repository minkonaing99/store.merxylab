'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Tile } from './tile'
import { StockBadge } from './stock-badge'
import { formatMmk } from '@/lib/money'
import { useCart } from '@/lib/cart-store'
import { getCategory } from '@/lib/products'
import type { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const add = useCart((s) => s.add)
  const category = getCategory(product.category)
  const stockQty = product.stockQty ?? (product.inStock ? 10 : 0)
  const isOut = stockQty <= 0

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (isOut) return
    add(product.id, 1)
    toast(`Added - ${product.name}`)
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block focus:outline-none">
        <Tile product={product} ratio="square" showLabel={false} />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="eyebrow">{category?.name}</div>
              {stockQty > 0 && stockQty <= (product.lowStockThreshold ?? 3) && (
                <StockBadge
                  stockQty={stockQty}
                  lowStockThreshold={product.lowStockThreshold}
                  size="sm"
                />
              )}
            </div>
            <h3 className="mt-1 font-display text-[18px] leading-tight text-ink">{product.name}</h3>
            <p className="mt-1 text-[13px] text-muted line-clamp-1">{product.tagline}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="price text-[15px] text-ink">{formatMmk(product.price)}</span>
            <button
              onClick={handleAdd}
              disabled={isOut}
              aria-label={isOut ? `${product.name} out of stock` : `Add ${product.name} to cart`}
              className={
                isOut
                  ? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-line text-muted cursor-not-allowed'
                  : 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink text-cream transition-colors hover:bg-accent'
              }
            >
              <Plus size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}
