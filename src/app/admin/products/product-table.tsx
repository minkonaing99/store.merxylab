'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatMmk } from '@/lib/money'

interface Row {
  id: string
  name: string
  slug: string
  categoryId: string
  priceMmk: number
  stockQty: number
  lowStockThreshold: number
  featured: boolean
  isActive: boolean
  hasPhotos: boolean
}

interface AdminProductTableProps {
  initial: Row[]
}

async function patchProduct(id: string, patch: Partial<Row>): Promise<boolean> {
  const res = await fetch(`/api/v1/admin/products/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return res.ok
}

export function AdminProductTable({ initial }: AdminProductTableProps) {
  const [rows, setRows] = useState(initial)

  function update(id: string, patch: Partial<Row>): void {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function commit(id: string, patch: Partial<Row>): Promise<void> {
    const ok = await patchProduct(id, patch)
    if (!ok) toast('Save failed.')
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.06em] text-muted">
            <th className="py-3 pr-3">Product</th>
            <th className="py-3 px-3 w-[120px]">Price (MMK)</th>
            <th className="py-3 px-3 w-[80px]">Stock</th>
            <th className="py-3 px-3 w-[80px]">Low</th>
            <th className="py-3 px-3 w-[70px]">Active</th>
            <th className="py-3 px-3 w-[80px]">Featured</th>
            <th className="py-3 px-3 w-[80px]">Photos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60 hover:bg-surface">
              <td className="py-3 pr-3">
                <div className="font-display text-[14px] text-ink">{r.name}</div>
                <div className="text-[11px] text-muted">
                  {r.categoryId} ·{' '}
                  <Link
                    href={`/product/${r.slug}`}
                    className="underline underline-offset-2 hover:text-accent"
                  >
                    view
                  </Link>
                </div>
              </td>
              <td className="py-3 px-3">
                <input
                  type="number"
                  value={r.priceMmk}
                  onChange={(e) => update(r.id, { priceMmk: Number(e.target.value) })}
                  onBlur={() => commit(r.id, { priceMmk: r.priceMmk })}
                  className="w-[110px] rounded border border-line bg-cream px-2 py-1 tabular-nums"
                />
                <div className="mt-1 text-[10px] text-muted">{formatMmk(r.priceMmk)}</div>
              </td>
              <td className="py-3 px-3">
                <input
                  type="number"
                  value={r.stockQty}
                  onChange={(e) => update(r.id, { stockQty: Number(e.target.value) })}
                  onBlur={() => commit(r.id, { stockQty: r.stockQty })}
                  className="w-[70px] rounded border border-line bg-cream px-2 py-1 tabular-nums"
                />
              </td>
              <td className="py-3 px-3">
                <input
                  type="number"
                  value={r.lowStockThreshold}
                  onChange={(e) =>
                    update(r.id, { lowStockThreshold: Number(e.target.value) })
                  }
                  onBlur={() => commit(r.id, { lowStockThreshold: r.lowStockThreshold })}
                  className="w-[70px] rounded border border-line bg-cream px-2 py-1 tabular-nums"
                />
              </td>
              <td className="py-3 px-3">
                <input
                  type="checkbox"
                  checked={r.isActive}
                  onChange={(e) => {
                    update(r.id, { isActive: e.target.checked })
                    commit(r.id, { isActive: e.target.checked })
                  }}
                />
              </td>
              <td className="py-3 px-3">
                <input
                  type="checkbox"
                  checked={r.featured}
                  onChange={(e) => {
                    update(r.id, { featured: e.target.checked })
                    commit(r.id, { featured: e.target.checked })
                  }}
                />
              </td>
              <td className="py-3 px-3">
                <input
                  type="checkbox"
                  checked={r.hasPhotos}
                  onChange={(e) => {
                    update(r.id, { hasPhotos: e.target.checked })
                    commit(r.id, { hasPhotos: e.target.checked })
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
