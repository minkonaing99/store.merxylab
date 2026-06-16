import type { MetadataRoute } from 'next'
import { categories, products } from '@/lib/products'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://merxylab.example'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, priority: 1 },
    { url: `${SITE}/shop`, lastModified: now, priority: 0.9 },
    { url: `${SITE}/search`, lastModified: now, priority: 0.4 },
    { url: `${SITE}/cart`, lastModified: now, priority: 0.3 },
  ]

  const categoryRoutes = categories.map((c) => ({
    url: `${SITE}/shop/${c.id}`,
    lastModified: now,
    priority: 0.8,
  }))

  const productRoutes = products.map((p) => ({
    url: `${SITE}/product/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    priority: 0.7,
  }))

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}
