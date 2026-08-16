/**
 * Set a user's password directly in the database.
 *
 *   npm run user:password -- <email> '<new password>'
 *
 * Also marks the account verified, so a stalled signup can sign in.
 * Local/operator use only - there is no auth check here.
 */
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema/auth'

const MIN_LENGTH = 10

async function main() {
  const [email, password] = process.argv.slice(2)

  if (!email || !password) {
    console.error("Usage: npm run user:password -- <email> '<new password>'")
    process.exit(1)
  }

  if (password.length < MIN_LENGTH) {
    console.error(`Password must be at least ${MIN_LENGTH} characters - sign-in rejects shorter.`)
    process.exit(1)
  }

  const normalised = email.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, normalised)).limit(1)

  if (!user) {
    console.error(`No account for ${normalised}`)
    process.exit(1)
  }

  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(password, 12),
      emailVerified: user.emailVerified ?? new Date(),
    })
    .where(eq(users.id, user.id))

  console.log(`Password updated for ${normalised} (role: ${user.role}).`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
