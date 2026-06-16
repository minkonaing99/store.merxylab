import { mysqlTable, varchar, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core'

export const newsletterSubscribers = mysqlTable('newsletter_subscribers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  source: varchar('source', { length: 40 }).notNull().default('homepage'),
  status: mysqlEnum('status', ['active', 'unsubscribed']).notNull().default('active'),
  unsubscribeToken: varchar('unsubscribe_token', { length: 64 }).notNull(),
  subscribedAt: timestamp('subscribed_at').defaultNow().notNull(),
  unsubscribedAt: timestamp('unsubscribed_at'),
})
