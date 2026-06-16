'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface AddressForm {
  id?: string
  label: string
  recipient: string
  phone: string
  divisionId: string
  city: string
  township: string
  street: string
  landmark: string
  isDefault: boolean
}

interface DivisionLite {
  id: string
  name: string
}

const EMPTY: AddressForm = {
  label: 'Home',
  recipient: '',
  phone: '+9591',
  divisionId: '',
  city: '',
  township: '',
  street: '',
  landmark: '',
  isDefault: false,
}

interface ManagerProps {
  initial: AddressForm[]
  divisions: DivisionLite[]
}

export function AddressManager({ initial, divisions }: ManagerProps) {
  const router = useRouter()
  const [form, setForm] = useState<AddressForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof AddressForm>(key: K, val: AddressForm[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/v1/addresses', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...form,
        landmark: form.landmark || null,
      }),
    })
    setSaving(false)
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      toast(json?.error?.message ?? 'Failed to save address.')
      return
    }
    toast('Address saved.')
    setForm(EMPTY)
    router.refresh()
  }

  async function remove(id: string) {
    const res = await fetch(`/api/v1/addresses/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast('Failed to delete.')
      return
    }
    router.refresh()
  }

  return (
    <div className="mt-8 space-y-10">
      {initial.length > 0 && (
        <section>
          <ul className="divide-y divide-line border-y border-line">
            {initial.map((a) => {
              const div = divisions.find((d) => d.id === a.divisionId)
              return (
                <li key={a.id} className="flex items-start justify-between gap-4 py-5">
                  <div className="min-w-0">
                    <div className="font-display text-[16px]">
                      {a.label}{' '}
                      {a.isDefault && (
                        <span className="ml-1 rounded-[var(--radius-pill)] bg-sand px-2 py-0.5 text-[11px] text-ink">
                          default
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[13px] text-ink-soft">
                      {a.recipient} · {a.street}, {a.township}, {a.city}
                      {div ? `, ${div.name}` : ''}
                    </div>
                    {a.landmark && (
                      <div className="text-[12px] text-muted">{a.landmark}</div>
                    )}
                    <div className="mt-0.5 text-[12px] text-muted">{a.phone}</div>
                  </div>
                  <button
                    onClick={() => a.id && remove(a.id)}
                    aria-label={`Delete ${a.label}`}
                    className="text-muted hover:text-error"
                  >
                    <Trash2 size={16} strokeWidth={1.5} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h3 className="font-display text-[20px]">Add address</h3>
        <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Label" value={form.label} onChange={(v) => set('label', v)} required />
          <Field
            label="Recipient name"
            value={form.recipient}
            onChange={(v) => set('recipient', v)}
            required
          />
          <Field
            label="Phone (+959XXXXXXXXX)"
            value={form.phone}
            onChange={(v) => set('phone', v)}
            required
          />
          <label className="block">
            <span className="text-[12px] text-muted">Division</span>
            <select
              value={form.divisionId}
              onChange={(e) => set('divisionId', e.target.value)}
              required
              className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-ink/40"
            >
              <option value="">Choose a division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="City" value={form.city} onChange={(v) => set('city', v)} required />
          <Field
            label="Township"
            value={form.township}
            onChange={(v) => set('township', v)}
            required
          />
          <Field
            className="md:col-span-2"
            label="Street + house no."
            value={form.street}
            onChange={(v) => set('street', v)}
            required
          />
          <Field
            className="md:col-span-2"
            label="Landmark (optional)"
            value={form.landmark}
            onChange={(v) => set('landmark', v)}
          />
          <label className="md:col-span-2 inline-flex items-center gap-2 text-[14px] text-ink-soft">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => set('isDefault', e.target.checked)}
            />
            Set as default
          </label>
          <button
            type="submit"
            disabled={saving}
            className="md:col-span-2 inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-ink py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save address'}
          </button>
        </form>
      </section>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  className?: string
}

function Field({ label, value, onChange, required, className }: FieldProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[12px] text-muted">{label}</span>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-ink/40"
      />
    </label>
  )
}
