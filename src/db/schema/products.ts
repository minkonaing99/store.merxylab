import {
  mysqlTable,
  varchar,
  text,
  int,
  bigint,
  boolean,
  char,
  timestamp,
  index,
} from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

export const categories = mysqlTable('categories', {
  id: varchar('id', { length: 32 }).primaryKey(),
  name: varchar('name', { length: 80 }).notNull(),
  description: text('description').notNull(),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const products = mysqlTable(
  'products',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull().unique(),
    name: varchar('name', { length: 120 }).notNull(),
    categoryId: varchar('category_id', { length: 32 })
      .notNull()
      .references(() => categories.id),
    priceMmk: bigint('price_mmk', { mode: 'number' }).notNull(),
    tagline: varchar('tagline', { length: 200 }).notNull(),
    description: text('description').notNull(),
    swatch: char('swatch', { length: 7 }).notNull(),
    stockQty: int('stock_qty').notNull().default(0),
    lowStockThreshold: int('low_stock_threshold').notNull().default(3),
    hasPhotos: boolean('has_photos').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    featured: boolean('featured').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    categoryIdx: index('idx_products_category').on(t.categoryId),
    featuredIdx: index('idx_products_featured').on(t.featured),
    activeIdx: index('idx_products_is_active').on(t.isActive),
  }),
)

export const productSpecs = mysqlTable(
  'product_specs',
  {
    id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
    productId: varchar('product_id', { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 80 }).notNull(),
    value: varchar('value', { length: 200 }).notNull(),
    sortOrder: int('sort_order').notNull().default(0),
  },
  (t) => ({
    productIdx: index('idx_specs_product').on(t.productId, t.sortOrder),
  }),
)

export const categoryRelations = relations(categories, ({ many }) => ({
  products: many(products),
}))

export const productRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  specs: many(productSpecs),
}))

export const productSpecRelations = relations(productSpecs, ({ one }) => ({
  product: one(products, {
    fields: [productSpecs.productId],
    references: [products.id],
  }),
}))
