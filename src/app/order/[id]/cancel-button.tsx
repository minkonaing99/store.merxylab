'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function CancelButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function cancel() {
    if (!confirm('Cancel this order? Stock will be restored.')) return
    setPending(true)
    const res = await fetch(`/api/v1/orders/${orderId}/cancel`, { method: 'POST' })
    setPending(false)
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      toast(json?.error?.message ?? 'Cancel failed.')
      return
    }
    toast('Order cancelled.')
    router.refresh()
  }

  return (
    <button
      onClick={cancel}
      disabled={pending}
      className="text-[13px] text-error underline underline-offset-4 disabled:opacity-50"
    >
      {pending ? 'Cancelling…' : 'Cancel order'}
    </button>
  )
}
