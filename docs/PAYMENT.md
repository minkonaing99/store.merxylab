# PAYMENT — checkout, methods, delivery, slip verification

Owner runbook for the Phase 9 checkout. Read this once. Refer back when adding methods or verifying slips.

## Payment methods supported

| ID         | Name             | Kind   | Notes                                                                 |
| ---------- | ---------------- | ------ | --------------------------------------------------------------------- |
| `kbz_pay`  | KBZ Pay          | wallet | Most-used wallet in Myanmar. Owner provides merchant QR + account info. |
| `aya_pay`  | Aya Pay          | wallet | Second-tier wallet.                                                   |
| `uab_pay`  | UAB Pay          | wallet | Third-tier wallet.                                                    |
| `kbz_bank` | KBZ Bank         | wallet | Manual bank transfer. `account_phone` field holds the bank account number; QR not required. |
| `cod`      | Cash on Delivery | cod    | Cap 500,000 MMK. Yangon + Mandalay only. Driver collects at door.     |

Methods render on `/checkout` when `is_active = true` AND `account_name` + `account_phone` are set. **QR is optional** — if the row has no `qr_image_url` the order page hides the QR slot and shows the account info column at full width. COD additionally requires the destination division + order total to satisfy the COD rules.

## Adding / editing a payment method

1. `/admin/payment-methods` → expand the method.
2. (Optional) Pick a QR image. Preview shows immediately; the file uploads only when you click **Save**. JPG/PNG/WEBP, max 4 MB; server auto-resizes to 600×600 WEBP.
3. Fill `Account name` and `Account phone` (use the bank account number here for `kbz_bank`).
4. (Optional) Write `Instructions` in markdown to clarify ("Exact amount only", "Include order ID in note", etc.).
5. Set the `Sort order` dropdown (1–5).
6. Toggle `Active`.
7. Click **Save**. Changes commit atomically: QR uploads first, then field PATCH, then local state.
8. **Discard** reverts the row to the last saved state.

## Shipping (BeeExpress, Mandalay base)

Flat fee per division. Edit at `/admin/divisions`:

| Division         | Fee MMK | COD | Notes |
| ---------------- | ------- | --- | ----- |
| Mandalay         | 3,000   | ✓   | Same-day inside Mandalay |
| Yangon           | 5,000   | ✓   | 1–5 days |
| Naypyidaw        | 5,000   | —   |       |
| Bago             | 5,750   | —   |       |
| Magway           | 5,750   | —   |       |
| Ayeyarwady       | 6,250   | —   |       |
| Chin             | 6,250   | —   |       |
| Mon              | 6,250   | —   |       |
| Shan             | 6,500   | —   |       |
| Rakhine          | 7,000   | —   |       |
| Kachin           | 8,500   | —   |       |
| Tanintharyi      | 8,500   | —   |       |
| Kayah            | —       | —   | **BLOCKED** — no BeeExpress coverage |
| Kayin            | —       | —   | **BLOCKED** |
| Sagaing          | —       | —   | **BLOCKED** |

If BeeExpress opens coverage in a blocked division: unblock at `/admin/divisions` → set fee → save.

## Order status machine

**Wallet path**
```
pending_payment ──(customer uploads slip)──▶ payment_submitted
        ▼                                          ▼
   cancelled                                     paid ──▶ shipped ──▶ delivered
```

**COD path**
```
pending_payment ──(owner phone-confirms)──▶ confirmed ──▶ shipped ──▶ delivered
        ▼
   cancelled
```

Customer can self-cancel only while `pending_payment`. After `payment_submitted` or `confirmed`, only the owner can cancel.

## Owner daily ops

1. **Morning check** — open `/admin/orders?status=payment_submitted` (queue of orders awaiting verification).
2. **Per order** — open detail page → see slip thumbnail + optional tx ref + total MMK + customer name. Open your bank app side-by-side. Match the amount + sender name + timestamp.
3. **If matched** — flip status to `paid`. Customer emailed automatically.
4. **If mismatched** — flip to `pending_payment` with a note (or `cancelled` if fraud). Customer can re-upload.
5. **Ship** — when packed, flip to `shipped`. Paste BeeExpress tracking ref in notes (visible to customer).
6. **Delivered** — flip to `delivered` once BeeExpress confirms.

**COD ops** — `/admin/orders?status=pending_payment` filtered by `payment_method_id=cod`. Phone the recipient. If reachable + confirmed → `confirmed`. If unreachable after 24h → cancel (call again next day before cancelling outright; customer experience matters).

## Slip security

- Magic-byte sniffed server-side (jpg/png/webp only).
- `sharp` resizes to 1600×1600 max, strips EXIF.
- Stored in Cloudflare R2 private bucket at key `slips/<orderId>/<uuid>.webp` — no public CDN binding, never directly addressable. `orders.payment_proof_url` holds just the basename. Served via authed `GET /api/v1/orders/[id]/slip` streaming route (owner OR admin) which does a `GetObject` against R2 after the auth check, `Cache-Control: private, no-store`. orderId is a 122-bit UUID so even an admin-side leak isolates one customer's slip.
- Rate-limited: 10 uploads/hour/user.
- Customer can re-upload only while `pending_payment` or `payment_submitted`. Replacing deletes the prior file.

## Customer alerts (React Email)

Customer mailbox is intentionally quiet — at most 2 emails per happy-path order so notifications don't fatigue.

- `order-invoice.tsx` — sent at payment confirmation: admin → `paid` (wallet) or `confirmed` (COD). Itemised invoice with subtotal + delivery + total + payment method.
- `order-delivered.tsx` — sent at admin → `delivered`. Short thanks + reply-with-issue hook.
- `order-cancelled.tsx` — sent on customer cancel + auto-cancel cron + admin cancel.

No customer email at order placement, slip upload, `shipped`, or any intermediate transition. Owner alerts (below) carry the operational signal.

## Owner alerts

- Email (`new-order-alert.tsx`, `slip-submitted-alert.tsx`) sent to `EMAIL_FROM`.
- Telegram bot push (when `TELEGRAM_BOT_TOKEN` + `TELEGRAM_OWNER_CHAT_ID` set) — short message with order ID + customer + amount + a link to the admin order page.

Customers also see a backup contact link: `t.me/$TELEGRAM_BACKUP_USERNAME` on `/order/[id]` and at the bottom of the slip upload form. Used when the upload fails or the customer wants to clarify something — never as the primary submission path.

## Failure modes + recovery

- **Slip uploaded but bank doesn't match** — owner cancels (with note) or sends back to `pending_payment` (rare).
- **Customer transfers wrong amount** — owner contacts via Telegram, asks for top-up or refund; manual recovery.
- **Customer transfers and forgets to upload slip** — auto-cancel after 24h; customer must re-order. Add a polite reminder email at the 18h mark (future enhancement).
- **Wallet QR misprint** — bank flags the merchant; owner toggles method `is_active = false` immediately at `/admin/payment-methods`.
- **BeeExpress lost parcel** — owner cancels the `shipped` order manually + arranges refund manually. Status enum has no `lost` state — use `cancelled` + a note.

## Env vars

| Var | Required? | Purpose |
| --- | --- | --- |
| `TELEGRAM_BACKUP_USERNAME` | optional | Customer-facing backup contact link (`t.me/<value>`). |
| `TELEGRAM_BOT_TOKEN` | optional | Owner alert bot token from BotFather. |
| `TELEGRAM_OWNER_CHAT_ID` | optional | Where the bot posts alerts. |

When `TELEGRAM_BOT_TOKEN` is unset, the app falls back to email-only owner alerts and silently drops Telegram pushes.
