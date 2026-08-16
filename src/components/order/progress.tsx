import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { fullTimestamp, timeAgo } from '@/lib/relative-time'
import type { MethodKind } from '@/lib/order-status'
import type { OrderStatus } from '@/db/schema/orders'

interface Step {
  /** The order status this step represents - also drives progress position. */
  status: OrderStatus
  label: string
  note: string
}

/**
 * Wallet orders carry an extra slip-verification step. COD orders skip
 * straight from placed to confirmed, because the shop confirms by phone.
 */
const WALLET_STEPS: readonly Step[] = [
  { status: 'pending_payment', label: 'Order placed', note: 'We have your order.' },
  {
    status: 'payment_submitted',
    label: 'Payment sent',
    note: 'Slip uploaded, waiting on our check.',
  },
  { status: 'confirmed', label: 'Confirmed', note: 'Payment verified, packed and on the way.' },
  { status: 'delivered', label: 'Delivered', note: 'Handed over. Enjoy the gear.' },
]

const COD_STEPS: readonly Step[] = [
  { status: 'pending_payment', label: 'Order placed', note: 'We have your order.' },
  { status: 'confirmed', label: 'Confirmed', note: 'Phone-confirmed, packed and on the way.' },
  { status: 'delivered', label: 'Delivered', note: 'Pay the courier in cash on arrival.' },
]

interface OrderProgressProps {
  status: OrderStatus
  kind: MethodKind
  placedAt: string
  updatedAt: string
}

export function OrderProgress({ status, kind, placedAt, updatedAt }: OrderProgressProps) {
  if (status === 'cancelled') {
    return (
      <div className="mt-8 rounded-[var(--radius)] border border-error/30 bg-error/5 px-5 py-4">
        <div className="text-[14px] font-medium text-error">Order cancelled</div>
        <p className="mt-1 text-[13px] text-ink-soft">
          Cancelled {timeAgo(updatedAt)}. Nothing is owed. Message us if this was a mistake and we
          will place it again.
        </p>
      </div>
    )
  }

  const steps = kind === 'cod' ? COD_STEPS : WALLET_STEPS
  const current = Math.max(
    0,
    steps.findIndex((s) => s.status === status),
  )

  return (
    <ol
      className="mt-8 grid gap-0 sm:grid-cols-[repeat(var(--steps),minmax(0,1fr))]"
      style={{ '--steps': steps.length } as CSSProperties}
    >
      {steps.map((step, i) => {
        const done = i < current
        const isCurrent = i === current
        // Only two timestamps exist on an order, so only the first and the
        // live step can be dated. Middle steps show no time.
        const stamp = i === 0 ? placedAt : isCurrent && i > 0 ? updatedAt : null

        return (
          <li key={step.status} className="relative flex gap-3 pb-6 sm:block sm:pb-0">
            {/* Rail: vertical on mobile, horizontal on desktop. */}
            <div className="flex flex-col items-center sm:flex-row sm:items-center">
              <span
                aria-hidden
                className={cn(
                  'z-10 size-3 shrink-0 rounded-full ring-4 ring-cream transition-colors',
                  done && 'bg-ink',
                  isCurrent && 'bg-accent',
                  !done && !isCurrent && 'bg-line',
                )}
              />
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    'w-px flex-1 sm:h-px sm:w-full sm:flex-none',
                    done ? 'bg-ink' : 'bg-line',
                  )}
                />
              )}
            </div>

            <div className="min-w-0 pb-1 sm:mt-3 sm:pr-4">
              <div
                className={cn(
                  'text-[13px] leading-tight',
                  isCurrent ? 'font-medium text-ink' : done ? 'text-ink' : 'text-muted',
                )}
              >
                {step.label}
              </div>
              {(isCurrent || done) && (
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{step.note}</p>
              )}
              {stamp && (
                <time
                  dateTime={stamp}
                  title={fullTimestamp(stamp)}
                  className="mt-1 block text-[11px] text-muted"
                >
                  {timeAgo(stamp)}
                </time>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
