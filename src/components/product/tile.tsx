import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { PhotoSlot, Product } from '@/lib/types'
import { PHOTO_BASE } from '@/lib/types'
import { getCategory } from '@/lib/products'

interface TileProps {
  product: Product
  ratio?: 'square' | 'portrait' | 'wide'
  className?: string
  showLabel?: boolean
  slot?: PhotoSlot
  priority?: boolean
  sizes?: string
}

const RATIO = {
  square: 'aspect-square',
  portrait: 'aspect-[4/5]',
  wide: 'aspect-[16/10]',
} as const

function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 < 140
}

export function Tile({
  product,
  ratio = 'square',
  className,
  showLabel = true,
  slot = '01',
  priority = false,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw',
}: TileProps) {
  const dark = isDark(product.swatch)
  const ink = dark ? '#F5EFE6' : '#1C1B19'
  const muted = dark ? 'rgba(245, 239, 230, 0.6)' : 'rgba(28, 27, 25, 0.5)'
  const category = getCategory(product.category)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius)]',
        'transition-shadow duration-200',
        RATIO[ratio],
        className,
      )}
      style={{ background: product.swatch }}
    >
      {product.hasPhotos && (
        <Image
          src={`${PHOTO_BASE}/${product.slug}/${slot}.webp`}
          alt={`${product.name} — ${category?.name ?? product.category}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      )}

      {!product.hasPhotos && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
          aria-hidden
        />
      )}

      {showLabel && !product.hasPhotos && (
        <>
          <div
            className="absolute top-4 left-4 text-[10px] tracking-[0.12em] uppercase font-medium"
            style={{ color: muted }}
          >
            {category?.name ?? product.category}
          </div>
          <div
            className="absolute bottom-4 left-4 right-4 text-[15px] font-semibold leading-tight"
            style={{ color: ink }}
          >
            {product.name}
          </div>
        </>
      )}
    </div>
  )
}
