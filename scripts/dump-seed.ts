/**
 * Regenerate the seed sections of docs/db-bootstrap.sql from the live database.
 *
 *   npm run db:dump-seed
 *
 * Rewrites sections 2-3 (divisions, payment_methods) in place. The schema
 * section and the header are left alone - those still come from
 * `drizzle-kit generate`.
 *
 * Reference data only, and only the two tables that are admin-editable and
 * that a fresh install cannot boot without. Deliberately excluded:
 *
 *   - categories       no longer a table; see `src/lib/categories.ts`
 *   - products, specs  the catalog is entered per-deployment through /admin,
 *                      and a fresh install is meant to start with an empty shop
 *   - users, orders, carts, reviews, wishlists, site_settings
 *                      customer data, no business in a committed file
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { db } from '@/db'
import { sql } from 'drizzle-orm'

const FILE = 'docs/db-bootstrap.sql'
const START = '-- =================================================================\n-- 2. Divisions'
const END = '-- =================================================================\n-- Bootstrap complete.'

type Row = Record<string, unknown>

/** MySQL literal. Numbers bare, null bare, everything else quoted + escaped. */
function literal(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
}

/**
 * Every statement this script runs, as constants.
 *
 * `sql.raw` skips parameterisation, so it must never see a string that was
 * built at runtime. Keying `rows()` to this object is what enforces that: the
 * parameter type is `keyof typeof QUERIES`, so an interpolated string is a
 * compile error rather than something a reviewer has to notice.
 */
const QUERIES = {
  divisions:
    'SELECT id, name, delivery_fee_mmk, cod_allowed, is_blocked, sort_order FROM divisions ORDER BY sort_order',
  payment_methods:
    'SELECT id, name, kind, account_name, account_phone, qr_image_url, instructions_md, sort_order, is_active FROM payment_methods ORDER BY sort_order',
} as const

async function rows(query: keyof typeof QUERIES): Promise<Row[]> {
  const [result] = await db.execute(sql.raw(QUERIES[query]))
  return result as unknown as Row[]
}

function insertBlock(table: string, columns: readonly string[], data: Row[]): string {
  if (data.length === 0) return `-- (no ${table} rows)\n`
  const cols = columns.map((c) => `\`${c}\``).join(', ')
  const values = data
    .map((r) => `(${columns.map((c) => literal(r[c])).join(', ')})`)
    .join(',\n')
  return `INSERT INTO \`${table}\` (${cols}) VALUES\n${values};\n`
}

function section(title: string, body: string): string {
  return `-- =================================================================\n-- ${title}\n-- =================================================================\n${body}\n`
}

async function main() {
  const divisions = await rows('divisions')
  const methods = await rows('payment_methods')

  const seed =
    section(
      '2. Divisions (BeeExpress shipping rates)',
      insertBlock(
        'divisions',
        ['id', 'name', 'delivery_fee_mmk', 'cod_allowed', 'is_blocked', 'sort_order'],
        divisions,
      ),
    ) +
    '\n' +
    section(
      '3. Payment methods',
      insertBlock(
        'payment_methods',
        [
          'id',
          'name',
          'kind',
          'account_name',
          'account_phone',
          'qr_image_url',
          'instructions_md',
          'sort_order',
          'is_active',
        ],
        methods,
      ),
    ) +
    '\n'

  const file = readFileSync(FILE, 'utf8')
  const head = file.slice(0, file.indexOf(START))
  const tail = file.slice(file.indexOf(END))
  if (!head || !tail) throw new Error('Could not find the seed section markers in ' + FILE)

  writeFileSync(FILE, head + seed + tail)

  console.log(`${FILE} updated from the live database:`)
  console.log(`  divisions       ${divisions.length}`)
  console.log(`  payment_methods ${methods.length}`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
