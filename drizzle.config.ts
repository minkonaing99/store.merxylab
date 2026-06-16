import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import { getDatabaseUrl } from './src/db/url'

config({ path: '.env.local' })
config({ path: '.env', override: false })

export default defineConfig({
  schema: './src/db/schema/*',
  out: './src/db/migrations',
  dialect: 'mysql',
  dbCredentials: { url: getDatabaseUrl() },
  strict: true,
  verbose: true,
})
