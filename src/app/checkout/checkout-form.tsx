'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatMmk } from '@/lib/money'
import { SelectField, TextField, TextAreaField } from '@/components/ui/field'
import { isMyanmarPhone, required } from '@/lib/validators'
import type { CartLine } from '@/lib/cart-session'

const COD_CAP_MMK = 500_000

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
  phone: '+9591',
  divisionId: '',
  city: '',
  township: '',
  street: '',
  landmark: '',
  saveToAccount: true,
}

type Step = 'delivery' | 'payment' | 'review'
type DraftFieldKey =
  | 'label'
  | 'recipient'
  | 'phone'
  | 'divisionId'
  | 'city'
  | 'township'
  | 'street'
type DraftErrors = Partial<Record<DraftFieldKey, string>>
type DraftTouched = Partial<Record<DraftFieldKey, boolean>>

function validateDraft(d: AddressDraft): DraftErrors {
  const next: DraftErrors = {}
  const label = required(d.label, 'Label')
  if (label) next.label = label
  const recipient = required(d.recipient, 'Recipient name')
  if (recipient) next.recipient = recipient
  const phone = required(d.phone, 'Phone')
  if (phone) next.phone = phone
  else if (!isMyanmarPhone(d.phone)) next.phone = 'Use +959 followed by 7–9 digits.'
  if (!d.divisionId) next.divisionId = 'Choose a division.'
  const city = required(d.city, 'City')
  if (city) next.city = city
  const township = required(d.township, 'Township')
  if (township) next.township = township
  const street = required(d.street, 'Street')
  if (street) next.street = street
  return next
}

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
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({})
  const [draftTouched, setDraftTouched] = useState<DraftTouched>({})

  const [paymentMethodId, setPaymentMethodId] = useState<string>('')
  const [paymentTouched, setPaymentTouched] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const activeDivisionId = useNewAddress
    ? draft.divisionId
    : addresses.find((a) => a.id === selectedAddressId)?.divisionId ?? ''
  const division = divisions.find((d) => d.id === activeDivisionId)
  const deliveryFee = division?.deliveryFeeMmk ?? 0
  const total = subtotal + deliveryFee

  const codEligible = Boolean(division?.codAllowed) && total <= COD_CAP_MMK
  const visibleMethods = useMemo(
    () => methods.filter((m) => (m.kind === 'cod' ? codEligible : true)),
    [methods, codEligible],
  )

  function setDraftField<K extends keyof AddressDraft>(key: K, val: AddressDraft[K]) {
    const next: AddressDraft = { ...draft, [key]: val }
    setDraft(next)
    if (key in draftTouched && draftTouched[key as DraftFieldKey]) {
      setDraftErrors(validateDraft(next))
    }
  }

  function markDraftTouched(field: DraftFieldKey) {
    setDraftTouched((t) => ({ ...t, [field]: true }))
    setDraftErrors(validateDraft(draft))
  }

  function liveDraftError(field: DraftFieldKey): string | null {
    if (!draftTouched[field]) return null
    return draftErrors[field] ?? null
  }

  function attemptContinueDelivery() {
    if (!useNewAddress) {
      if (!selectedAddressId) {
        toast('Choose a saved address or add a new one.')
        return
      }
      setStep('payment')
      return
    }
    const v = validateDraft(draft)
    setDraftErrors(v)
    setDraftTouched({
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
    setStep('payment')
  }

  function attemptContinuePayment() {
    setPaymentTouched(true)
    if (!paymentMethodId) {
      toast('Pick a payment method.')
      return
    }
    setStep('review')
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
            setField={setDraftField}
            liveError={liveDraftError}
            markTouched={markDraftTouched}
            onContinue={attemptContinueDelivery}
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
            setPaymentMethodId={(id) => {
              setPaymentMethodId(id)
              setPaymentTouched(true)
            }}
            paymentTouched={paymentTouched}
            codEligible={codEligible}
            onBack={() => setStep('delivery')}
            onContinue={attemptContinuePayment}
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
            <TextAreaField
              label="Order notes (optional)"
              value={notes}
              onChange={(v) => setNotes(v.slice(0, 1000))}
              placeholder="Anything we should know about delivery."
              rows={3}
            />
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
  liveError: (field: DraftFieldKey) => string | null
  markTouched: (field: DraftFieldKey) => void
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
    liveError,
    markTouched,
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

      <div className="mt-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-accent hover:opacity-80">
          <input
            type="radio"
            name="addr"
            checked={useNewAddress}
            onChange={() => setUseNewAddress(true)}
          />
          + Add new address
        </label>
      </div>

      {useNewAddress && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <TextField
            label="Label"
            required
            value={draft.label}
            onChange={(v) => setField('label', v)}
            onBlur={() => markTouched('label')}
            error={liveError('label')}
          />
          <TextField
            label="Recipient name"
            required
            autoComplete="name"
            value={draft.recipient}
            onChange={(v) => setField('recipient', v)}
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
            value={draft.phone}
            onChange={(v) => setField('phone', v)}
            onBlur={() => markTouched('phone')}
            error={liveError('phone')}
          />
          <SelectField
            label="Division"
            required
            value={draft.divisionId}
            onChange={(v) => setField('divisionId', v)}
            onBlur={() => markTouched('divisionId')}
            error={liveError('divisionId')}
          >
            <option value="">Choose a division</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {formatMmk(d.deliveryFeeMmk)}
              </option>
            ))}
          </SelectField>
          <TextField
            label="City"
            required
            autoComplete="address-level2"
            value={draft.city}
            onChange={(v) => setField('city', v)}
            onBlur={() => markTouched('city')}
            error={liveError('city')}
          />
          <TextField
            label="Township"
            required
            value={draft.township}
            onChange={(v) => setField('township', v)}
            onBlur={() => markTouched('township')}
            error={liveError('township')}
          />
          <TextField
            className="md:col-span-2"
            label="Street + house no."
            required
            autoComplete="street-address"
            value={draft.street}
            onChange={(v) => setField('street', v)}
            onBlur={() => markTouched('street')}
            error={liveError('street')}
          />
          <TextField
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

      <div className="mt-8 flex justify-end">
        <button
          onClick={onContinue}
          className="inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-ink px-8 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent md:w-auto"
        >
          Continue to payment
        </button>
      </div>
    </section>
  )
}

interface PaymentSectionProps {
  methods: PaymentMethodLite[]
  paymentMethodId: string
  setPaymentMethodId: (id: string) => void
  paymentTouched: boolean
  codEligible: boolean
  onBack: () => void
  onContinue: () => void
}

function PaymentSection(props: PaymentSectionProps) {
  const {
    methods,
    paymentMethodId,
    setPaymentMethodId,
    paymentTouched,
    codEligible,
    onBack,
    onContinue,
  } = props

  if (methods.length === 0) {
    return (
      <section className="mt-4 rounded-[var(--radius)] border border-line bg-surface p-6 text-[14px] text-ink-soft">
        No payment methods available yet. The shop owner is configuring them.
      </section>
    )
  }

  const showError = paymentTouched && !paymentMethodId

  return (
    <section className="mt-4 space-y-3">
      {methods.map((m) => (
        <label
          key={m.id}
          className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border bg-surface p-4 transition-colors ${
            paymentMethodId === m.id
              ? 'border-ink/50'
              : showError
                ? 'border-error/60'
                : 'border-line hover:border-ink/30'
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
      {showError && (
        <p className="text-[12px] text-error">Choose a payment method to continue.</p>
      )}
      {!codEligible && (
        <p className="text-[12px] text-muted">
          Cash on Delivery available only for Yangon + Mandalay orders under {formatMmk(500_000)}.
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          onClick={onBack}
          className="inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream px-6 py-3 text-[14px] font-medium text-ink hover:border-ink/40 sm:w-auto"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-ink px-8 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent sm:w-auto"
        >
          Continue to review
        </button>
      </div>
    </section>
  )
}
