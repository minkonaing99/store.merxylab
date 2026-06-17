'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type Status =
  | 'pending_payment'
  | 'payment_submitted'
  | 'confirmed'
  | 'delivered'
  | 'cancelled'

type MethodKind = 'wallet' | 'cod'

interface Props {
  orderId: string
  status: Status
  methodKind: MethodKind
  hasSlip: boolean
}

interface Action {
  label: string
  target: Status
  variant: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  hint?: string
}

function actionsFor(status: Status, methodKind: MethodKind, hasSlip: boolean): Action[] {
  const isWallet = methodKind === 'wallet'
  const out: Action[] = []

  if (status === 'pending_payment') {
    if (isWallet) {
      out.push({
        label: 'Mark slip submitted',
        target: 'payment_submitted',
        variant: 'secondary',
        hint: 'Use only if the customer transferred but did not upload through the app.',
      })
    } else {
      out.push({
        label: 'Confirm order (phone-verified)',
        target: 'confirmed',
        variant: 'primary',
        hint: 'COD: phone-confirm the buyer before marking confirmed. Decrements stock.',
      })
    }
  }

  if (status === 'payment_submitted') {
    out.push({
      label: 'Confirm payment',
      target: 'confirmed',
      variant: 'primary',
      disabled: !hasSlip,
      hint: hasSlip
        ? 'Cross-check the slip above against your bank app. Confirming decrements stock and emails the customer an invoice.'
        : 'No slip uploaded yet.',
    })
    out.push({
      label: 'Reject slip (back to pending)',
      target: 'pending_payment',
      variant: 'secondary',
      hint: 'Use when the uploaded slip is wrong / amount mismatched / unreadable.',
    })
  }

  if (status === 'confirmed') {
    out.push({
      label: 'Mark delivered',
      target: 'delivered',
      variant: 'primary',
    })
  }

  if (status !== 'delivered' && status !== 'cancelled') {
    out.push({ label: 'Cancel order', target: 'cancelled', variant: 'danger' })
  }

  return out
}

export function AdminOrderActions({ orderId, status, methodKind, hasSlip }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState<Status | null>(null)
  const actions = actionsFor(status, methodKind, hasSlip)

  async function go(target: Status) {
    setPending(target)
    const res = await fetch(`/api/v1/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: target }),
    })
    setPending(null)
    if (res.ok) {
      toast(`Status → ${target.replace('_', ' ')}`)
      router.refresh()
      return
    }
    const body = (await res.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null
    const code = body?.error?.code
    const msg = body?.error?.message
    if (code === 'OUT_OF_STOCK') {
      const sku = msg?.split(':')[1] ?? ''
      toast(`Out of stock: ${sku || 'one or more items'}. Restock before confirming.`)
    } else if (msg) {
      toast(msg)
    } else {
      toast(`Action failed (${res.status}).`)
    }
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface p-5 text-[13px] text-muted">
        Order is in a terminal state - no further actions.
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-5">
      <h3 className="font-display text-[15px]">Actions</h3>
      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map((a) => {
          const busy = pending === a.target
          const styleByVariant =
            a.variant === 'primary'
              ? 'bg-ink text-cream hover:bg-accent'
              : a.variant === 'danger'
                ? 'border border-error/40 text-error hover:bg-error/5'
                : 'border border-line text-ink hover:border-ink/40'
          return (
            <button
              key={a.target}
              type="button"
              onClick={() => go(a.target)}
              disabled={busy || a.disabled}
              className={`inline-flex items-center justify-center rounded-[var(--radius-pill)] px-5 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${styleByVariant}`}
            >
              {busy ? 'Saving…' : a.label}
            </button>
          )
        })}
      </div>
      {actions
        .filter((a) => a.hint)
        .map((a) => (
          <p key={a.target} className="mt-3 text-[12px] text-muted">
            <span className="font-medium text-ink">{a.label}:</span> {a.hint}
          </p>
        ))}
    </div>
  )
}
