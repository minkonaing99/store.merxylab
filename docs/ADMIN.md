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
| `/admin/products`          | List + `+ New product` button + per-row expand (Edit details + Edit photos). Save / Discard per section.   |
| `/admin/orders`            | List + filter by status + status updates.                    |
| `/admin/reviews`           | Moderation queue — approve / reject.                         |
| `/admin/newsletter`        | CSV export of `newsletter_subscribers`.                      |
| `/admin/payment-methods`   | Per-method Save / Discard editor (KBZ Pay / Aya Pay / UAB Pay / KBZ Bank / COD). Optional QR upload, account name + phone (or bank account number), instructions, sort 1–5, active toggle. |
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

## Adding a new product

1. `/admin/products` → **+ New product** at the top.
2. Fill the inline form:
   - **Name** → the slug auto-fills (`Razer Viper V3` → `razer-viper-v3`). Editable.
   - **Category** — pick one of the 6.
   - **Price (MMK)** — whole MMK, no subunit.
   - **Tagline** — one line, shows on the product card.
   - **Description** — paragraph for PDP.
   - **Swatch** — click the color square; matches the dominant product color so placeholder tiles look right.
   - **Stock** + **Low-stock threshold** — used by the low-stock alert.
   - **Featured** + **Active** — toggles.
3. **Specs** — `+` to add a row; `Sensor / PixArt PAW3395`, etc. Trash to remove.
4. Click **Save**. The product appears in the list immediately.

## Adding photos to a product

1. On `/admin/products`, expand the product row → **Edit photos**.
2. Four slots (`01..04`). Slot **01** is the PDP hero and the card thumb source.
3. **Replace**: pick a JPG/PNG/WEBP file ≤ 10 MB. Server writes two files per slot — `0X.webp` (1600×1600 hero) and `0X-thumb.webp` (600×600 card thumb), EXIF stripped.
4. **Remove**: deletes both files for that slot.
5. `has_photos` flag flips automatically based on whether slot 01 exists.

## Editing an existing product

1. Row → **Edit details**.
2. Change any field. Slug is editable but **must stay unique** — collisions are rejected at Save time.
3. Specs editor uses REPLACE semantics on Save (the whole spec array is rewritten).
4. **Discard** reverts to the last saved state without touching the DB.

Deleting a product: toggle **Active** off — this removes it from `/shop` without breaking order history references. There is no hard-delete path on purpose.

## See also

- `docs/AUTH-SETUP.md` — Auth.js + SMTP env vars
- `docs/DEPLOY.md` — Hostinger Business shared deploy
- `docs/SCHEMA.md` — DB schema (`orders.status` enum)
