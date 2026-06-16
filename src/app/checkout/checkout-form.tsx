'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatMmk } from '@/lib/money'
import type { CartLine } from '@/lib/cart-session'

const COD_CAP_MMK = 500_000
const PHONE_REGEX = /^\+959\d{7,9}$/

interface AddressLite {
  id: string
  label: string
  recipient: string
  phone: string
  divisionId: string
  city: string
  township: string
  street: string
  landmark: string | null
}

interface DivisionLite {
  id: string
  name: string
  deliveryFeeMmk: number
  codAllowed: boolean
}

interface PaymentMethodLite {
  id: string
  name: string
  kind: 'wallet' | 'cod'
}

interface CheckoutFormProps {
  addresses: AddressLite[]
  divisions: DivisionLite[]
  methods: PaymentMethodLite[]
  lines: CartLine[]
  subtotal: number
}

interface AddressDraft {
  label: string
  recipient: string
  phone: string
  divisionId: string
  city: string
  township: string
  street: string
  landmark: string
  saveToAccount: boolean
}

const EMPTY_DRAFT: AddressDraft = {
  label: 'Home',
  recipient: '',
  phone: '+959',
  divisionId: '',
  city: '',
  township: '',
  street: '',
  landmark: '',
  saveToAccount: true,
}

type Step = 'delivery' | 'payment' | 'review'

export function CheckoutForm({
  addresses,
  divisions,
  methods,
  lines,
  subtotal,
}: CheckoutFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('delivery')

  const [useNewAddress, setUseNewAddress] = useState(addresses.length === 0)
  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? '')
  const [draft, setDraft] = useState<AddressDraft>(EMPTY_DRAFT)

  const [paymentMethodId, setPaymentMethodId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const activeDivisionId = useNewAddress
    ? draft.divisionId
    : addresses.find((a) => a.id === selectedAddressId)?.divisionId ?? ''
  const division = divisions.find((d) => d.id === activeDivisionId)
  const deliveryFee = division?.deliveryFeeMmk ?? 0
  const total = subtotal + deliveryFee

  const codEligible =
    Boolean(division?.codAllowed) && total <= COD_CAP_MMK
  const visibleMethods = useMemo(
    () => methods.filter((m) => (m.kind === 'cod' ? codEligible : true)),
    [methods, codEligible],
  )

  function setField<K extends keyof AddressDraft>(key: K, val: AddressDraft[K]) {
    setDraft((d) => ({ ...d, [key]: val }))
  }

  function deliveryValid(): boolean {
    if (!useNewAddress) return Boolean(selectedAddressId)
    if (!PHONE_REGEX.test(draft.phone)) return false
    if (!draft.recipient || !draft.divisionId || !draft.city || !draft.township || !draft.street) {
      return false
    }
    return true
  }

  function paymentValid(): boolean {
    return Boolean(paymentMethodId)
  }

  async function placeOrder() {
    setLoading(true)
    const body: Record<string, unknown> = {
      paymentMethodId,
      notes: notes || null,
    }
    if (useNewAddress) {
      body.newAddress = {
        label: draft.label,
        recipient: draft.recipient,
        phone: draft.phone,
        divisionId: draft.divisionId,
        city: draft.city,
        township: draft.township,
        street: draft.street,
        landmark: draft.landmark || null,
        saveToAccount: draft.saveToAccount,
      }
    } else {
      body.shippingAddressId = selectedAddressId
    }

    const res = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.data?.orderId) {
      toast(json?.error?.message ?? 'Order failed.')
      return
    }
    router.push(`/order/${json.data.orderId}`)
  }

  return (
    <div className="mt-10 grid items-start gap-10 md:grid-cols-[1.4fr_1fr] md:gap-14">
      <div>
        <StepHeader index={1} label="Delivery" active={step === 'delivery'} done={step !== 'delivery'} />
        {step === 'delivery' ? (
          <DeliverySection
            addresses={addresses}
            divisions={divisions}
            useNewAddress={useNewAddress}
            setUseNewAddress={setUseNewAddress}
            selectedAddressId={selectedAddressId}
            setSelectedAddressId={setSelectedAddressId}
            draft={draft}
            setField={setField}
            onContinue={() => {
              if (!deliveryValid()) {
                toast('Complete every required delivery field.')
                return
              }
              setStep('payment')
            }}
          />
        ) : (
          <SummaryLine
            text={
              useNewAddress
                ? `${draft.recipient} · ${draft.street}, ${draft.township}, ${draft.city}`
                : (() => {
                    const a = addresses.find((x) => x.id === selectedAddressId)
                    return a
                      ? `${a.recipient} · ${a.street}, ${a.township}, ${a.city}`
                      : '—'
                  })()
            }
            onEdit={() => setStep('delivery')}
          />
        )}

        <StepHeader
          index={2}
          label="Payment method"
          active={step === 'payment'}
          done={step === 'review'}
        />
        {step === 'payment' ? (
          <PaymentSection
            methods={visibleMethods}
            paymentMethodId={paymentMethodId}
            setPaymentMethodId={setPaymentMethodId}
            codEligible={codEligible}
            onBack={() => setStep('delivery')}
            onContinue={() => {
              if (!paymentValid()) {
                toast('Pick a payment method.')
                return
              }
              setStep('review')
            }}
          />
        ) : step === 'review' ? (
          <SummaryLine
            text={methods.find((m) => m.id === paymentMethodId)?.name ?? '—'}
            onEdit={() => setStep('payment')}
          />
        ) : null}

        <StepHeader index={3} label="Review and place" active={step === 'review'} />
        {step === 'review' && (
          <section className="mt-4 rounded-[var(--radius)] border border-line bg-surface p-6">
            <label className="block">
              <span className="text-[12px] text-muted">Order notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                rows={3}
                className="mt-1.5 w-full rounded-[var(--radius)] border border-line bg-cream p-3 text-[14px] focus:outline-none focus:border-ink/40"
                placeholder="Anything we should know about delivery."
              />
            </label>
            <button
              onClick={placeOrder}
              disabled={loading}
              className="mt-6 inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-ink py-3.5 text-[14px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-60"
            >
              {loading ? 'Placing order…' : `Place order — ${formatMmk(total)}`}
            </button>
          </section>
        )}
      </div>

      <aside className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 md:p-8">
        <h2 className="font-display text-[22px]">Summary</h2>
        <ul className="mt-4 space-y-2">
          {lines.map((l) => (
            <li key={l.productId} className="flex items-center justify-between text-[13px]">
              <span className="text-ink-soft">
                {l.qty} × {l.product.name}
              </span>
              <span className="price text-ink">{formatMmk(l.product.priceMmk * l.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between text-[13px]">
          <span className="text-ink-soft">Subtotal</span>
          <span className="price text-ink">{formatMmk(subtotal)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[13px]">
          <span className="text-ink-soft">
            Delivery{division ? ` · ${division.name}` : ''}
          </span>
          <span className="price text-ink">
            {division ? formatMmk(deliveryFee) : '—'}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-4">
          <span className="font-display text-[18px]">Total</span>
          <span className="price font-display text-[20px]">{formatMmk(total)}</span>
        </div>
      </aside>
    </div>
  )
}

interface StepHeaderProps {
  index: number
  label: string
  active?: boolean
  done?: boolean
}

function StepHeader({ index, label, active, done }: StepHeaderProps) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] tabular-nums ${
          done
            ? 'bg-accent text-cream'
            : active
              ? 'bg-ink text-cream'
              : 'bg-sand text-muted'
        }`}
      >
        {index}
      </span>
      <h2 className={`font-display text-[20px] ${active ? 'text-ink' : 'text-muted'}`}>{label}</h2>
    </div>
  )
}

interface SummaryLineProps {
  text: string
  onEdit: () => void
}

function SummaryLine({ text, onEdit }: SummaryLineProps) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-[var(--radius)] border border-line bg-cream px-4 py-3 text-[13px]">
      <span className="text-ink-soft">{text}</span>
      <button onClick={onEdit} className="text-accent underline underline-offset-4">
        Edit
      </button>
    </div>
  )
}

interface DeliverySectionProps {
  addresses: AddressLite[]
  divisions: DivisionLite[]
  useNewAddress: boolean
  setUseNewAddress: (v: boolean) => void
  selectedAddressId: string
  setSelectedAddressId: (v: string) => void
  draft: AddressDraft
  setField: <K extends keyof AddressDraft>(key: K, val: AddressDraft[K]) => void
  onContinue: () => void
}

function DeliverySection(props: DeliverySectionProps) {
  const {
    addresses,
    divisions,
    useNewAddress,
    setUseNewAddress,
    selectedAddressId,
    setSelectedAddressId,
    draft,
    setField,
    onContinue,
  } = props

  return (
    <section className="mt-4">
      {addresses.length > 0 && (
        <div className="mb-4 space-y-3">
          {addresses.map((a) => {
            const div = divisions.find((d) => d.id === a.divisionId)
            return (
              <label
                key={a.id}
                className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border bg-surface p-4 transition-colors ${
                  !useNewAddress && selectedAddressId === a.id
                    ? 'border-ink/50'
                    : 'border-line hover:border-ink/30'
                }`}
              >
                <input
                  type="radio"
                  name="addr"
                  value={a.id}
                  checked={!useNewAddress && selectedAddressId === a.id}
                  onChange={() => {
                    setUseNewAddress(false)
                    setSelectedAddressId(a.id)
                  }}
                  className="mt-1.5"
                />
                <div className="min-w-0">
                  <div className="font-display text-[16px]">{a.label}</div>
                  <div className="mt-0.5 text-[13px] text-ink-soft">
                    {a.recipient} · {a.phone}
                  </div>
                  <div className="text-[13px] text-ink-soft">
                    {a.street}, {a.township}, {a.city}
                    {div ? `, ${div.name}` : ''}
                  </div>
                  {a.landmark && (
                    <div className="text-[12px] text-muted">{a.landmark}</div>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      )}

      <label className="inline-flex items-center gap-2 text-[13px] text-accent">
        <input
          type="radio"
          name="addr"
          checked={useNewAddress}
          onChange={() => setUseNewAddress(true)}
        />
        + Add new address
      </label>

      {useNewAddress && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Label" value={draft.label} onChange={(v) => setField('label', v)} required />
          <Field
            label="Recipient name"
            value={draft.recipient}
            onChange={(v) => setField('recipient', v)}
            required
          />
          <Field
            label="Phone (+959XXXXXXXXX)"
            value={draft.phone}
            onChange={(v) => setField('phone', v)}
            required
            placeholder="+9591234567"
          />
          <label className="block">
            <span className="text-[12px] text-muted">Division</span>
            <select
              value={draft.divisionId}
              onChange={(e) => setField('divisionId', e.target.value)}
              className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-ink/40"
              required
            >
              <option value="">Choose a division</option>
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} · {formatMmk(d.deliveryFeeMmk)}
                </option>
              ))}
            </select>
          </label>
          <Field label="City" value={draft.city} onChange={(v) => setField('city', v)} required />
          <Field
            label="Township"
            value={draft.township}
            onChange={(v) => setField('township', v)}
            required
          />
          <Field
            className="md:col-span-2"
            label="Street + house no."
            value={draft.street}
            onChange={(v) => setField('street', v)}
            required
          />
          <Field
            className="md:col-span-2"
            label="Landmark (optional)"
            value={draft.landmark}
            onChange={(v) => setField('landmark', v)}
          />
          <label className="md:col-span-2 inline-flex items-center gap-2 text-[13px] text-ink-soft">
            <input
              type="checkbox"
              checked={draft.saveToAccount}
              onChange={(e) => setField('saveToAccount', e.target.checked)}
            />
            Save this address to my account
          </label>
        </div>
      )}

      <button
        onClick={onContinue}
        className="mt-6 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
      >
        Continue to payment
      </button>
    </section>
  )
}

interface PaymentSectionProps {
  methods: PaymentMethodLite[]
  paymentMethodId: string
  setPaymentMethodId: (id: string) => void
  codEligible: boolean
  onBack: () => void
  onContinue: () => void
}

function PaymentSection(props: PaymentSectionProps) {
  const { methods, paymentMethodId, setPaymentMethodId, codEligible, onBack, onContinue } = props

  if (methods.length === 0) {
    return (
      <section className="mt-4 rounded-[var(--radius)] border border-line bg-surface p-6 text-[14px] text-ink-soft">
        No payment methods available yet. The shop owner is configuring them.
      </section>
    )
  }

  return (
    <section className="mt-4 space-y-3">
      {methods.map((m) => (
        <label
          key={m.id}
          className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border bg-surface p-4 transition-colors ${
            paymentMethodId === m.id ? 'border-ink/50' : 'border-line hover:border-ink/30'
          }`}
        >
          <input
            type="radio"
            name="method"
            value={m.id}
            checked={paymentMethodId === m.id}
            onChange={() => setPaymentMethodId(m.id)}
          />
          <div>
            <div className="font-display text-[16px]">{m.name}</div>
            <div className="text-[12px] text-muted">
              {m.kind === 'wallet' ? 'Mobile wallet — pay by QR' : 'Cash on Delivery'}
            </div>
          </div>
        </label>
      ))}
      {!codEligible && (
        <p className="text-[12px] text-muted">
          Cash on Delivery available only for Yangon + Mandalay orders under {formatMmk(500_000)}.
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream px-6 py-3 text-[14px] font-medium text-ink hover:border-ink/40"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
        >
          Continue to review
        </button>
      </div>
    </section>
  )
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
  className?: string
}

function Field({ label, value, onChange, required, placeholder, className }: FieldProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[12px] text-muted">{label}</span>
      <input
        type="text"
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-ink/40"
      />
    </label>
  )
}
