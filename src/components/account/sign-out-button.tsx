'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="mt-2 rounded px-3 py-2 text-left text-[14px] text-muted hover:bg-line hover:text-error"
    >
      Sign out
    </button>
  )
}
