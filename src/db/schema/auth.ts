import {
  mysqlTable,
  varchar,
  text,
  int,
  timestamp,
  primaryKey,
  mysqlEnum,
  index,
} from 'drizzle-orm/mysql-core'
import type { AdapterAccountType } from 'next-auth/adapters'

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 120 }),
  email: varchar('email', { length: 254 }).notNull().unique(),
  emailVerified: timestamp('email_verified', { fsp: 3 }),
  passwordHash: varchar('password_hash', { length: 60 }),
  image: varchar('image', { length: 500 }),
  role: mysqlEnum('role', ['customer', 'admin']).notNull().default('customer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const accounts = mysqlTable(
  'accounts',
  {
    userId: varchar('userId', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 40 }).$type<AdapterAccountType>().notNull(),
    provider: varchar('provider', { length: 80 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 200 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: int('expires_at'),
    token_type: varchar('token_type', { length: 40 }),
    scope: varchar('scope', { length: 500 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 500 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
    userIdx: index('idx_accounts_user').on(t.userId),
  }),
)

export const sessions = mysqlTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
})

export const verificationTokens = mysqlTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 254 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
)
