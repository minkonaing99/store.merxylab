export type CategoryId =
  | 'keyboards'
  | 'mice'
  | 'headsets'
  | 'microphones'
  | 'speakers'
  | 'accessories'

export interface Spec {
  readonly label: string
  readonly value: string
}

export interface Product {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly category: CategoryId
  /** Whole MMK units (no subunit). */
  readonly price: number
  readonly tagline: string
  readonly description: string
  readonly specs: readonly Spec[]
  readonly swatch: string
  readonly inStock: boolean
  readonly hasPhotos: boolean
  readonly featured?: boolean
  readonly stockQty?: number
  readonly lowStockThreshold?: number
  readonly createdAt: string
  readonly updatedAt: string
}

export const PHOTO_SLOTS = ['01', '02', '03', '04'] as const
export type PhotoSlot = (typeof PHOTO_SLOTS)[number]
// Public R2 base, e.g. `https://cdn.merxylab.com`. Falls back to '/products'
// for local dev without R2 configured.
const CDN_BASE = (process.env.NEXT_PUBLIC_CDN_URL ?? '').replace(/\/$/, '')
export const PHOTO_BASE = CDN_BASE ? `${CDN_BASE}/products` : '/products'

export interface Category {
  readonly id: CategoryId
  readonly name: string
  readonly description: string
  readonly order: number
}

export const QTY_MIN = 1
export const QTY_MAX = 99
export const SEARCH_QUERY_MAX = 200
