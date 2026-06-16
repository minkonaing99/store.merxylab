#!/usr/bin/env node
/**
 * scripts/seed-payment.ts
 *
 * Seeds divisions + payment_methods. Idempotent.
 *
 *   pnpm db:seed:payment
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env', override: false })

import { db } from '../src/db'
import { divisions } from '../src/db/schema/divisions'
import { paymentMethods } from '../src/db/schema/payment-methods'

interface DivisionRow {
  id: string
  name: string
  deliveryFeeMmk: number
  codAllowed: boolean
  isBlocked: boolean
  sortOrder: number
}

const DIVISIONS: DivisionRow[] = [
  { id: 'mandalay', name: 'Mandalay Region', deliveryFeeMmk: 3000, codAllowed: true, isBlocked: false, sortOrder: 1 },
  { id: 'yangon', name: 'Yangon Region', deliveryFeeMmk: 5000, codAllowed: true, isBlocked: false, sortOrder: 2 },
  { id: 'naypyidaw', name: 'Naypyidaw Union Territory', deliveryFeeMmk: 5000, codAllowed: false, isBlocked: false, sortOrder: 3 },
  { id: 'bago', name: 'Bago Region', deliveryFeeMmk: 5750, codAllowed: false, isBlocked: false, sortOrder: 4 },
  { id: 'magway', name: 'Magway Region', deliveryFeeMmk: 5750, codAllowed: false, isBlocked: false, sortOrder: 5 },
  { id: 'ayeyarwady', name: 'Ayeyarwady Region', deliveryFeeMmk: 6250, codAllowed: false, isBlocked: false, sortOrder: 6 },
  { id: 'chin', name: 'Chin State', deliveryFeeMmk: 6250, codAllowed: false, isBlocked: false, sortOrder: 7 },
  { id: 'mon', name: 'Mon State', deliveryFeeMmk: 6250, codAllowed: false, isBlocked: false, sortOrder: 8 },
  { id: 'shan', name: 'Shan State', deliveryFeeMmk: 6500, codAllowed: false, isBlocked: false, sortOrder: 9 },
  { id: 'rakhine', name: 'Rakhine State', deliveryFeeMmk: 7000, codAllowed: false, isBlocked: false, sortOrder: 10 },
  { id: 'kachin', name: 'Kachin State', deliveryFeeMmk: 8500, codAllowed: false, isBlocked: false, sortOrder: 11 },
  { id: 'tanintharyi', name: 'Tanintharyi Region', deliveryFeeMmk: 8500, codAllowed: false, isBlocked: false, sortOrder: 12 },
  { id: 'kayah', name: 'Kayah State', deliveryFeeMmk: 0, codAllowed: false, isBlocked: true, sortOrder: 13 },
  { id: 'kayin', name: 'Kayin State', deliveryFeeMmk: 0, codAllowed: false, isBlocked: true, sortOrder: 14 },
  { id: 'sagaing', name: 'Sagaing Region', deliveryFeeMmk: 0, codAllowed: false, isBlocked: true, sortOrder: 15 },
]

const PAYMENT_METHODS = [
  { id: 'kbz_pay', name: 'KBZ Pay', kind: 'wallet' as const, sortOrder: 1 },
  { id: 'aya_pay', name: 'Aya Pay', kind: 'wallet' as const, sortOrder: 2 },
  { id: 'uab_pay', name: 'UAB Pay', kind: 'wallet' as const, sortOrder: 3 },
  { id: 'kbz_bank', name: 'KBZ Bank', kind: 'wallet' as const, sortOrder: 4 },
  { id: 'cod', name: 'Cash on Delivery', kind: 'cod' as const, sortOrder: 5 },
]

async function main(): Promise<void> {
  console.log(`\n  seeding ${DIVISIONS.length} divisions and ${PAYMENT_METHODS.length} payment methods\n`)

  await db.delete(divisions)
  await db.insert(divisions).values(DIVISIONS)

  await db.delete(paymentMethods)
  await db.insert(paymentMethods).values(
    PAYMENT_METHODS.map((m) => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      sortOrder: m.sortOrder,
      isActive: false,
    })),
  )

  console.log(`  ✓ ${DIVISIONS.length} divisions`)
  console.log(`  ✓ ${PAYMENT_METHODS.length} payment methods (all inactive — configure in /admin/payment-methods)\n`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
