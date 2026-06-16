# PAYMENT — checkout, methods, delivery, slip verification

Owner runbook for the Phase 9 checkout. Read this once. Refer back when adding methods or verifying slips.

## Payment methods supported

| ID        | Name      | Kind   | Notes                                                                 |
| --------- | --------- | ------ | --------------------------------------------------------------------- |
| `kbz_pay` | KBZ Pay   | wallet | Most-used wallet in Myanmar. Owner provides merchant QR + account info. |
| `aya_pay` | Aya Pay   | wallet | Second-tier wallet. Same shape as KBZ Pay.                            |
| `uab_pay` | UAB Pay   | wallet | Third-tier wallet. Same shape.                                        |
| `cod`     | Cash on Delivery | cod | Cap 500,000 MMK. Yangon + Mandalay only. Driver collects at door.     |

Methods only render on `/checkout` when `is_active = true` AND the wallet has complete data (account_name + account_phone + qr_image_url). COD additionally requires the destination division + order total to satisfy the COD rules.

## Adding / editing a wallet method

1. `/admin/payment-methods` → choose method (or create new row if introducing a new wallet).
2. Upload QR image. Convert your wallet app's merchant QR PNG to WEBP first (`cwebp -q 90 in.png -o public/payment-qr/kbz_pay.webp` then point `qr_image_url` at the public path).
3. Enter account name (as it appears on the wallet) + account phone.
4. Toggle `is_active = true`.
5. The method appears at `/checkout` immediately (no deploy).

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
- Saved as `public/slips/<orderId>/<uuid>.webp`. The folder name = order UUID so a leaked slip URL doesn't reveal other customers' slips.
- Rate-limited: 10 uploads/hour/user.
- Customer can re-upload only while `pending_payment` or `payment_submitted`. Replacing deletes the prior file.

## Customer alerts (React Email)

- `order-placed.tsx` — sent on order creation.
- `slip-received.tsx` — sent when slip uploads successfully.
- `paid.tsx` — sent when owner verifies + flips to `paid`.
- `shipped.tsx` — sent when owner flips to `shipped` (includes BeeExpress tracking ref if pasted).
- `order-cancelled.tsx` — sent on customer cancel + auto-cancel + owner cancel.

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
