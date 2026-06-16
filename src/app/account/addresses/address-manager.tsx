'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { SelectField, TextField } from '@/components/ui/field'
import { isMyanmarPhone, required } from '@/lib/validators'

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

type FieldKey = 'label' | 'recipient' | 'phone' | 'divisionId' | 'city' | 'township' | 'street'
type Errors = Partial<Record<FieldKey, string>>
type Touched = Partial<Record<FieldKey, boolean>>

export function AddressManager({ initial, divisions }: ManagerProps) {
  const router = useRouter()
  const [form, setForm] = useState<AddressForm>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Touched>({})
  const [saving, setSaving] = useState(false)

  function set<K extends keyof AddressForm>(key: K, val: AddressForm[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function validate(values: AddressForm): Errors {
    const next: Errors = {}
    const label = required(values.label, 'Label')
    if (label) next.label = label
    const recipient = required(values.recipient, 'Recipient name')
    if (recipient) next.recipient = recipient
    const phone = required(values.phone, 'Phone')
    if (phone) next.phone = phone
    else if (!isMyanmarPhone(values.phone)) {
      next.phone = 'Use +959 followed by 7–9 digits.'
    }
    const division = required(values.divisionId, 'Division')
    if (division) next.divisionId = 'Choose a division.'
    const city = required(values.city, 'City')
    if (city) next.city = city
    const township = required(values.township, 'Township')
    if (township) next.township = township
    const street = required(values.street, 'Street')
    if (street) next.street = street
    return next
  }

  function markTouched(field: FieldKey) {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validate(form))
  }

  function liveError(field: FieldKey): string | null {
    if (!touched[field]) return null
    return errors[field] ?? null
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    setTouched({
      label: true,
      recipient: true,
      phone: true,
      divisionId: true,
      city: true,
      township: true,
      street: true,
    })
    if (Object.keys(v).length > 0) {
      toast('Fix the highlighted fields.')
      return
    }
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
    setErrors({})
    setTouched({})
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
        <form onSubmit={save} noValidate className="mt-4 grid gap-3 md:grid-cols-2">
          <TextField
            label="Label"
            required
            value={form.label}
            onChange={(v) => {
              set('label', v)
              if (touched.label) setErrors(validate({ ...form, label: v }))
            }}
            onBlur={() => markTouched('label')}
            error={liveError('label')}
          />
          <TextField
            label="Recipient name"
            required
            autoComplete="name"
            value={form.recipient}
            onChange={(v) => {
              set('recipient', v)
              if (touched.recipient) setErrors(validate({ ...form, recipient: v }))
            }}
            onBlur={() => markTouched('recipient')}
            error={liveError('recipient')}
          />
          <TextField
            label="Phone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="+9591234567"
            helper="Format: +959 followed by 7–9 digits."
            value={form.phone}
            onChange={(v) => {
              set('phone', v)
              if (touched.phone) setErrors(validate({ ...form, phone: v }))
            }}
            onBlur={() => markTouched('phone')}
            error={liveError('phone')}
          />
          <SelectField
            label="Division"
            required
            value={form.divisionId}
            onChange={(v) => {
              set('divisionId', v)
              if (touched.divisionId) setErrors(validate({ ...form, divisionId: v }))
            }}
            onBlur={() => markTouched('divisionId')}
            error={liveError('divisionId')}
          >
            <option value="">Choose a division</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="City"
            required
            autoComplete="address-level2"
            value={form.city}
            onChange={(v) => {
              set('city', v)
              if (touched.city) setErrors(validate({ ...form, city: v }))
            }}
            onBlur={() => markTouched('city')}
            error={liveError('city')}
          />
          <TextField
            label="Township"
            required
            value={form.township}
            onChange={(v) => {
              set('township', v)
              if (touched.township) setErrors(validate({ ...form, township: v }))
            }}
            onBlur={() => markTouched('township')}
            error={liveError('township')}
          />
          <TextField
            className="md:col-span-2"
            label="Street + house no."
            required
            autoComplete="street-address"
            value={form.street}
            onChange={(v) => {
              set('street', v)
              if (touched.street) setErrors(validate({ ...form, street: v }))
            }}
            onBlur={() => markTouched('street')}
            error={liveError('street')}
          />
          <TextField
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
