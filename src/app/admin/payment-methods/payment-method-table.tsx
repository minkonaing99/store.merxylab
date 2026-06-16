'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Row {
  id: string
  name: string
  kind: 'wallet' | 'cod'
  accountName: string | null
  accountPhone: string | null
  qrImageUrl: string | null
  instructionsMd: string | null
  sortOrder: number
  isActive: boolean
}

export function PaymentMethodTable({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial)

  function update(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function save(id: string, patch: Partial<Row>) {
    update(id, patch)
    const res = await fetch(`/api/v1/admin/payment-methods/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) toast('Save failed.')
  }

  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [uploadError, setUploadError] = useState<Record<string, string>>({})

  async function uploadQr(id: string, file: File) {
    setUploadError((m) => ({ ...m, [id]: '' }))
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      const msg = 'Use JPG, PNG, or WEBP.'
      setUploadError((m) => ({ ...m, [id]: msg }))
      toast(msg)
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      const msg = 'File over 4 MB. Compress before uploading.'
      setUploadError((m) => ({ ...m, [id]: msg }))
      toast(msg)
      return
    }
    setUploading((m) => ({ ...m, [id]: true }))
    const form = new FormData()
    form.append('methodId', id)
    form.append('qr', file)
    const res = await fetch('/api/v1/admin/payment-methods/qr', {
      method: 'POST',
      body: form,
    })
    setUploading((m) => ({ ...m, [id]: false }))
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = json?.error?.message ?? `Upload failed (HTTP ${res.status}).`
      setUploadError((m) => ({ ...m, [id]: msg }))
      toast(msg)
      return
    }
    update(id, { qrImageUrl: json.data.qrImageUrl })
    toast('QR uploaded.')
  }

  return (
    <div className="mt-6 space-y-6">
      {rows.map((r) => (
        <article
          key={r.id}
          className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 md:p-6"
        >
          <header className="flex items-center justify-between gap-4">
            <div>
              <div className="font-display text-[20px]">{r.name}</div>
              <div className="text-[12px] uppercase tracking-[0.06em] text-muted">{r.kind}</div>
            </div>
            <label className="inline-flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={r.isActive}
                onChange={(e) => save(r.id, { isActive: e.target.checked })}
              />
              Active
            </label>
          </header>

          {r.kind === 'wallet' ? (
            <div className="mt-5 grid gap-4 md:grid-cols-[160px_1fr]">
              <div>
                {r.qrImageUrl ? (
                  <img
                    src={r.qrImageUrl}
                    alt={`${r.name} QR`}
                    className="aspect-square w-[160px] rounded border border-line bg-cream object-contain"
                  />
                ) : (
                  <div className="aspect-square w-[160px] rounded border border-line bg-cream" />
                )}
                <div className="mt-2">
                  <label className="block text-[12px] text-muted">
                    Upload QR
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={Boolean(uploading[r.id])}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void uploadQr(r.id, file)
                        e.target.value = ''
                      }}
                      className="mt-1 block w-full text-[12px] file:mr-2 file:rounded-[var(--radius-pill)] file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-cream file:transition-colors hover:file:bg-accent disabled:opacity-60"
                    />
                  </label>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">
                    JPG, PNG, or WEBP · max 4&nbsp;MB · square works best.
                    <br />
                    Server auto-resizes to 600&times;600.
                  </p>
                  {uploading[r.id] && (
                    <p className="mt-1 text-[11px] text-accent">Uploading…</p>
                  )}
                  {uploadError[r.id] && (
                    <p className="mt-1 text-[11px] text-error">{uploadError[r.id]}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-3">
                <Field
                  label="Account name"
                  value={r.accountName ?? ''}
                  onBlur={(v) => save(r.id, { accountName: v || null })}
                  onChange={(v) => update(r.id, { accountName: v })}
                />
                <Field
                  label="Account phone"
                  value={r.accountPhone ?? ''}
                  onBlur={(v) => save(r.id, { accountPhone: v || null })}
                  onChange={(v) => update(r.id, { accountPhone: v })}
                />
                <label className="block">
                  <span className="text-[12px] text-muted">Instructions (markdown, optional)</span>
                  <textarea
                    value={r.instructionsMd ?? ''}
                    rows={3}
                    onChange={(e) => update(r.id, { instructionsMd: e.target.value })}
                    onBlur={(e) => save(r.id, { instructionsMd: e.target.value || null })}
                    className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
                  />
                </label>
                <Field
                  label="Sort order"
                  type="number"
                  value={String(r.sortOrder)}
                  onBlur={(v) => save(r.id, { sortOrder: Number(v) || 0 })}
                  onChange={(v) => update(r.id, { sortOrder: Number(v) || 0 })}
                />
              </div>
            </div>
          ) : (
            <p className="mt-5 text-[13px] text-muted">
              Cash on Delivery has no account info. Toggle active to enable it for eligible orders.
            </p>
          )}
        </article>
      ))}
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur: (v: string) => void
  type?: string
}

function Field({ label, value, onChange, onBlur, type = 'text' }: FieldProps) {
  return (
    <label className="block">
      <span className="text-[12px] text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
      />
    </label>
  )
}
