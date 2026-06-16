import { mysqlTable, varchar, text, boolean, int, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core'

export const paymentMethods = mysqlTable('payment_methods', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 60 }).notNull(),
  kind: mysqlEnum('kind', ['wallet', 'cod']).notNull(),
  accountName: varchar('account_name', { length: 120 }),
  accountPhone: varchar('account_phone', { length: 20 }),
  qrImageUrl: varchar('qr_image_url', { length: 255 }),
  instructionsMd: text('instructions_md'),
  sortOrder: int('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})
