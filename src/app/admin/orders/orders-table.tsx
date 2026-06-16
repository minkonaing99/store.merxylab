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

interface Row {
  id: string
  status: Status
  totalMmk: number
  placedAt: string
  userEmail: string
  userName: string | null
}

interface AdminOrdersTableProps {
  initial: Row[]
}

const STATUSES: Status[] = [
  'pending_payment',
  'payment_submitted',
  'confirmed',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
]

export function AdminOrdersTable({ initial }: AdminOrdersTableProps) {
  const [rows, setRows] = useState(initial)

  async function setStatus(id: string, status: Status) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    const res = await fetch(`/api/v1/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) toast('Save failed.')
    else toast(`Status → ${status.replace('_', ' ')}`)
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
                  {STATUSES.map((s) => (
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
