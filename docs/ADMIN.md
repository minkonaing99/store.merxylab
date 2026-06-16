# Admin UI

Custom `/admin` UI for the shop owner. Role-gated via `users.role = 'admin'`. Drizzle Studio remains as power-user fallback (local-only via SSH tunnel against prod).

## Promotion

There is no self-service admin upgrade. Promote by DB only:

```sql
UPDATE users SET role = 'admin' WHERE email = 'owner@merxylab.com';
```

## Gating

- `/admin/*` server-checks `users.role === 'admin'` via `requireAdmin()` in `src/lib/admin-guard.ts`. Non-admin authed users hitting `/admin` redirect to `/account`. Unauthed users redirect to `/signin?callbackUrl=/admin`.
- All `/api/v1/admin/*` mutations also server-check role. Never trust the client.

## Routes

| Path                       | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `/admin`                   | KPI dashboard: revenue (MMK), order count, low-stock alerts, orders awaiting verification. |
| `/admin/products`          | Inline editor — price, stock, featured, active.              |
| `/admin/orders`            | List + filter by status + status updates.                    |
| `/admin/reviews`           | Moderation queue — approve / reject.                         |
| `/admin/newsletter`        | CSV export of `newsletter_subscribers`.                      |
| `/admin/payment-methods`   | CRUD per wallet method (KBZ Pay / Aya Pay / UAB Pay / COD). Upload QR, edit account name + phone + instructions, toggle active. |
| `/admin/divisions`         | Edit per-division delivery_fee_mmk + COD-allowed flag + block flag. |

## Payment flow (Myanmar retail)

See `docs/PAYMENT.md` for the full runbook. Summary:

**Wallet path** (KBZ Pay / Aya Pay / UAB Pay):
1. Customer checks out → `/order/[id]` shows merchant QR + amount + order UUID.
2. Customer transfers in their wallet app, returns, uploads slip image (+ optional tx ref) → status → `payment_submitted`.
3. Owner gets email + Telegram alert. Opens `/admin/orders/[id]` → cross-checks the slip thumbnail against the bank-app entry → flips to `paid`.
4. Owner ships → `shipped` → marks `delivered`.

**COD path**:
1. Customer checks out (only available for Yangon/Mandalay under 500,000 MMK) → status `pending_payment`.
2. Owner phones recipient → confirms → flips to `confirmed`.
3. Owner ships → `shipped`. Driver collects cash → owner marks `delivered`.

**Customer cancel**: allowed only while `pending_payment`. After slip submitted, owner cancels manually.

**Auto-cancel**: `scripts/cancel-expired-orders.ts` runs nightly; cancels orders still in `pending_payment` past `expires_at` (placed_at + 24h), restores stock, emails customer.

No card payments. No webhook. The owner is the source of truth for payment confirmation.

## Low-stock alerts

When an order pushes a product's `stockQty` below its `lowStockThreshold`, the order-processing path queues a `low-stock-alert` email to `EMAIL_FROM` (which the owner reads). Component: `emails/low-stock-alert.tsx`.

## See also

- `docs/AUTH-SETUP.md` — Auth.js + SMTP env vars
- `docs/DEPLOY.md` — Hostinger Business shared deploy
- `docs/SCHEMA.md` — DB schema (`orders.status` enum)
