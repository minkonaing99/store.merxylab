'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatMmk } from '@/lib/money'

type Status =
  | 'pending_payment'
  | 'payment_submitted'
  | 'confirmed'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

type MethodKind = 'wallet' | 'cod'

interface Row {
  id: string
  status: Status
  totalMmk: number
  placedAt: string
  userEmail: string
  userName: string | null
  methodKind: MethodKind
}

interface AdminOrdersTableProps {
  initial: Row[]
}

// Mirrors WALLET_TRANSITIONS + COD_TRANSITIONS in
// src/app/api/v1/admin/orders/[id]/route.ts. Keep in sync.
const WALLET_TRANSITIONS: Record<Status, Status[]> = {
  pending_payment: ['payment_submitted', 'cancelled'],
  payment_submitted: ['pending_payment', 'paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  confirmed: [],
  cancelled: [],
}

const COD_TRANSITIONS: Record<Status, Status[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  payment_submitted: [],
  paid: [],
  cancelled: [],
}

function allowedNextStatuses(current: Status, kind: MethodKind): Status[] {
  const table = kind === 'cod' ? COD_TRANSITIONS : WALLET_TRANSITIONS
  return [current, ...table[current]]
}

export function AdminOrdersTable({ initial }: AdminOrdersTableProps) {
  const [rows, setRows] = useState(initial)

  async function setStatus(id: string, status: Status) {
    const prev = rows.find((r) => r.id === id)?.status
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    const res = await fetch(`/api/v1/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast(`Status → ${status.replace('_', ' ')}`)
      return
    }
    if (prev !== undefined) {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: prev } : r)))
    }
    const body = (await res.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null
    const code = body?.error?.code
    const msg = body?.error?.message
    if (code === 'OUT_OF_STOCK') {
      const sku = msg?.split(':')[1] ?? ''
      toast(`Out of stock: ${sku || 'one or more items'}. Restock before marking paid.`)
    } else if (msg) {
      toast(msg)
    } else {
      toast(`Save failed (${res.status}).`)
    }
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.06em] text-muted">
            <th className="py-3 pr-3">Order</th>
            <th className="py-3 px-3">Customer</th>
            <th className="py-3 px-3 w-[140px]">Total</th>
            <th className="py-3 px-3 w-[170px]">Status</th>
            <th className="py-3 px-3 w-[120px]">Placed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60 hover:bg-surface">
              <td className="py-3 pr-3">
                <Link
                  href={`/account/orders/${r.id}`}
                  className="font-display text-[14px] hover:text-accent"
                >
                  {r.id.slice(0, 8)}
                </Link>
              </td>
              <td className="py-3 px-3">
                <div className="text-[13px] text-ink">{r.userName ?? r.userEmail}</div>
                {r.userName && (
                  <div className="text-[11px] text-muted">{r.userEmail}</div>
                )}
              </td>
              <td className="py-3 px-3 price">{formatMmk(r.totalMmk)}</td>
              <td className="py-3 px-3">
                <select
                  value={r.status}
                  onChange={(e) => setStatus(r.id, e.target.value as Status)}
                  className="rounded border border-line bg-cream px-2 py-1 text-[12px]"
                >
                  {allowedNextStatuses(r.status, r.methodKind).map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-3 px-3 text-[12px] text-muted">
                {new Date(r.placedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-10 text-center text-[14px] text-muted">
                No orders yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
