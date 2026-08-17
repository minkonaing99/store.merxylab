import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/db'
import { users, accounts, sessions, verificationTokens } from '@/db/schema/auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'customer' | 'admin'
    } & DefaultSession['user']
  }
}

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(200),
})

const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

/**
 * A bcrypt-12 digest of a random value nobody holds. Compared against when no
 * user matches, purely so a failed lookup costs the same wall time as a real
 * one. Never matches any password.
 */
const ABSENT_USER_HASH = '$2b$12$E31s8sxwUuJY8S8A2Q/J7e2J9.UtwI7SzImyK4yfqyryQ/AVu9tzq'

export const { handlers, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/signin',
    verifyRequest: '/verify',
    error: '/signin',
  },
  providers: [
    Credentials({
      name: 'email',
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email.toLowerCase()))
          .limit(1)

        // Compare unconditionally. Returning early on "no such user" makes a
        // miss finish in ~5ms against ~250ms for a hit, which is enough of a
        // gap to enumerate registered addresses; hashing against a throwaway
        // digest keeps both paths on the same clock.
        const ok = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? ABSENT_USER_HASH,
        )
        if (!user || !user.passwordHash || !ok) return null

        // Checked after the comparison so the cost is identical either way. A
        // caller who gets this far already supplied the right password, so
        // learning the account is unverified tells them nothing new.
        if (!user.emailVerified) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        }
      },
    }),
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            // Left at the default (false). Enabling it hands an existing
            // account to anyone who can present a Google profile carrying the
            // same address, with no proof they own the local account. Auth.js
            // answers the collision with `error=OAuthAccountNotLinked`, which
            // /signin renders as "sign in with your password first".
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && 'id' in user && user.id) {
        token.id = user.id
        token.role = (user as { role?: 'customer' | 'admin' }).role ?? 'customer'
      }
      return token
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as 'customer' | 'admin') ?? 'customer'
      }
      return session
    },
  },
  trustHost: true,
})
