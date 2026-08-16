/**
 * Regenerate the seed sections of docs/db-bootstrap.sql from the live database.
 *
 *   npm run db:dump-seed
 *
 * Rewrites sections 2-6 (divisions, payment_methods, categories, products,
 * product_specs) in place. The schema section and the header are left alone -
 * those still come from `drizzle-kit generate`.
 *
 * Reference/catalog data only. Users, orders, carts, reviews, wishlists and
 * site_settings are never dumped: a fresh install starts empty, and they hold
 * customer data that has no business in a committed file.
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

async function rows(query: string): Promise<Row[]> {
  const [result] = await db.execute(sql.raw(query))
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
  const divisions = await rows(
    'SELECT id, name, delivery_fee_mmk, cod_allowed, is_blocked, sort_order FROM divisions ORDER BY sort_order',
  )
  const methods = await rows(
    'SELECT id, name, kind, account_name, account_phone, qr_image_url, instructions_md, sort_order, is_active FROM payment_methods ORDER BY sort_order',
  )
  const categories = await rows(
    'SELECT id, name, description, sort_order FROM categories ORDER BY sort_order',
  )
  const products = await rows(
    `SELECT id, slug, name, category_id, price_mmk, tagline, description, swatch, stock_qty,
            low_stock_threshold, has_photos, is_active, featured, sort_order
     FROM products ORDER BY sort_order, name`,
  )
  const specs = await rows(
    'SELECT product_id, label, value, sort_order FROM product_specs ORDER BY product_id, sort_order',
  )

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
    '\n' +
    section(
      '4. Categories',
      insertBlock('categories', ['id', 'name', 'description', 'sort_order'], categories),
    ) +
    '\n' +
    section(
      '5. Products',
      insertBlock(
        'products',
        [
          'id',
          'slug',
          'name',
          'category_id',
          'price_mmk',
          'tagline',
          'description',
          'swatch',
          'stock_qty',
          'low_stock_threshold',
          'has_photos',
          'is_active',
          'featured',
          'sort_order',
        ],
        products,
      ),
    ) +
    '\n' +
    section(
      '6. Product specs',
      insertBlock('product_specs', ['product_id', 'label', 'value', 'sort_order'], specs),
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
  console.log(`  categories      ${categories.length}`)
  console.log(`  products        ${products.length}`)
  console.log(`  product_specs   ${specs.length}`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
