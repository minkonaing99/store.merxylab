import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })
config({ path: '.env', override: false })

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is required (see .env.example)')

export default defineConfig({
  schema: './src/db/schema/*',
  out: './src/db/migrations',
  dialect: 'mysql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
