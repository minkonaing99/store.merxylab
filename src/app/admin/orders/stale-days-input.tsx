'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const MIN = 1
const MAX = 30

export function StaleDaysInput({ value }: { value: number }) {
  const router = useRouter()
  const [draft, setDraft] = useState(String(value))
  const [saving, setSaving] = useState(false)

  async function save() {
    const n = Number(draft)
    if (!Number.isFinite(n) || n < MIN || n > MAX) {
      setDraft(String(value))
      toast(`Enter a number between ${MIN} and ${MAX}.`)
      return
    }
    if (n === value) return

    setSaving(true)
    const res = await fetch('/api/v1/admin/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'orders_stale_days', value: n }),
    }).catch(() => null)
    setSaving(false)

    if (!res?.ok) {
      setDraft(String(value))
      const body = (await res?.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      toast(body?.error?.message ?? 'Could not save.')
      return
    }

    toast(`Stale after ${n} ${n === 1 ? 'day' : 'days'}.`)
    router.refresh()
  }

  return (
    <label className="flex items-center gap-2 text-[12px] text-muted">
      stale after
      <input
        type="number"
        min={MIN}
        max={MAX}
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className="w-14 rounded border border-line bg-cream px-2 py-1 text-center text-[12px] text-ink disabled:opacity-50"
      />
      days
    </label>
  )
}
