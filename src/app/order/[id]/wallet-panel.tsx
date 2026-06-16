'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatMmk } from '@/lib/money'

interface WalletMethod {
  name: string
  accountName: string | null
  accountPhone: string | null
  qrImageUrl: string | null
  instructionsMd: string | null
}

interface WalletPanelProps {
  orderId: string
  totalMmk: number
  method: WalletMethod
  telegramUrl: string | null
  existingProofUrl: string | null
}

export function WalletPanel({
  orderId,
  totalMmk,
  method,
  telegramUrl,
  existingProofUrl,
}: WalletPanelProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [txRef, setTxRef] = useState('')
  const [uploading, setUploading] = useState(false)

  async function submit() {
    if (!file) {
      toast('Pick a slip image first.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast('File over 8 MB.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('Use JPG, PNG, or WEBP.')
      return
    }

    setUploading(true)
    const form = new FormData()
    form.append('slip', file)
    if (txRef) form.append('txRef', txRef)

    const res = await fetch(`/api/v1/orders/${orderId}/slip`, {
      method: 'POST',
      body: form,
    })
    setUploading(false)
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      toast(json?.error?.message ?? 'Upload failed.')
      return
    }
    toast('Slip uploaded.')
    router.refresh()
  }

  return (
    <section className="mt-10 rounded-[var(--radius-lg)] border border-line bg-surface p-6 md:p-8">
      <h2 className="font-display text-[22px]">Pay with {method.name}</h2>
      <div
        className={`mt-5 grid gap-6 md:items-start ${
          method.qrImageUrl ? 'md:grid-cols-[220px_1fr]' : ''
        }`}
      >
        {method.qrImageUrl && (
          <img
            src={method.qrImageUrl}
            alt={`${method.name} merchant QR`}
            width={220}
            height={220}
            className="rounded-[var(--radius)] border border-line bg-cream"
          />
        )}
        <div className="text-[14px] text-ink-soft">
          <div className="mb-2 flex justify-between">
            <span>Amount</span>
            <span className="price font-medium text-ink">{formatMmk(totalMmk)}</span>
          </div>
          <div className="mb-2 flex justify-between">
            <span>Account name</span>
            <span className="font-mono text-ink">{method.accountName ?? '—'}</span>
          </div>
          <div className="mb-2 flex justify-between">
            <span>Account phone</span>
            <span className="font-mono text-ink">{method.accountPhone ?? '—'}</span>
          </div>
          <div className="mb-2 flex justify-between">
            <span>Order ref.</span>
            <span className="font-mono text-[12px] text-ink">{orderId}</span>
          </div>
          {method.instructionsMd && (
            <p className="mt-3 whitespace-pre-wrap text-[12px] text-muted">{method.instructionsMd}</p>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h3 className="font-display text-[18px]">Upload your transfer slip</h3>
        <p className="mt-1 text-[13px] text-muted">
          Screenshot from your wallet app. JPG, PNG, or WEBP, under 8 MB.
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-3 block w-full text-[13px] text-ink-soft"
        />
        <input
          type="text"
          placeholder="Transaction reference (optional)"
          value={txRef}
          onChange={(e) => setTxRef(e.target.value.slice(0, 120))}
          className="mt-3 w-full rounded-[var(--radius)] border border-line bg-cream px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-ink/40"
        />
        <button
          onClick={submit}
          disabled={uploading}
          className="mt-4 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : existingProofUrl ? 'Replace slip' : 'Submit slip'}
        </button>
        {existingProofUrl && (
          <p className="mt-3 text-[12px] text-muted">A slip was already submitted. Re-uploading replaces it.</p>
        )}
        {telegramUrl && (
          <p className="mt-4 text-[12px] text-muted">
            Trouble uploading?{' '}
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
              Message us on Telegram
            </a>
            .
          </p>
        )}
      </div>
    </section>
  )
}
