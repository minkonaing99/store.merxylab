/**
 * One-off: render the 3 customer-facing order emails with their PreviewProps
 * and send them to a test inbox via the configured SMTP transport.
 *
 *   pnpm tsx --env-file=.env scripts/send-test-emails.ts [recipient]
 */
import { createElement } from 'react'
import { sendMail } from '../src/lib/mail'
import { OrderInvoice } from '../emails/order-invoice'
import { OrderDelivered } from '../emails/order-delivered'
import { OrderCancelled } from '../emails/order-cancelled'

const to = process.argv[2] ?? 'dreaddoc99@gmail.com'

const sends = [
  {
    subject: '[TEST] Payment confirmed — your merxylab invoice',
    react: createElement(OrderInvoice, OrderInvoice.PreviewProps),
  },
  {
    subject: '[TEST] Your merxylab order has arrived',
    react: createElement(OrderDelivered, OrderDelivered.PreviewProps),
  },
  {
    subject: '[TEST] Your merxylab order was cancelled',
    react: createElement(OrderCancelled, OrderCancelled.PreviewProps),
  },
]

async function main() {
  for (const { subject, react } of sends) {
    const { delivered } = await sendMail({ to, subject, react })
    console.log(`${delivered ? '✓ sent' : '✗ not delivered (SMTP unconfigured)'} → ${subject}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
