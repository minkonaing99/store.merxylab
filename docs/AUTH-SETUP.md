# AUTH-SETUP — sign-in, SMTP, Google OAuth

Phase 6 ships auth wired but two pieces need real credentials before the flow is end-to-end usable:

1. **SMTP** (so verification + order emails actually send)
2. **Google OAuth** (so the "Continue with Google" button works)

Until SMTP is configured, sign-up emails get logged to the dev server console and you can manually flip `email_verified` to test sign-in. Until Google OAuth is configured, only credentials (email + password) sign-in is available.

---

## 1. SMTP via Hostinger Webmail

### A. Create a mailbox in hPanel

1. Sign in to Hostinger → hPanel → Emails → **Email Accounts**.
2. Click **Create email account** under your domain.
3. Suggested mailboxes (Business plan gives 5):
   - `noreply@your-domain.com` — transactional sends (verification, orders)
   - `hello@your-domain.com` — customer replies
   - `orders@your-domain.com` — order copies/owner inbox
4. Copy the password Hostinger generates (or set your own).

### B. Find SMTP settings

Hostinger SMTP defaults (Business shared plan):

| Setting   | Value                   |
| --------- | ----------------------- |
| SMTP host | `smtp.hostinger.com`    |
| SMTP port | `465` (TLS) — preferred |
| Port alt  | `587` (STARTTLS)        |
| Username  | the full email address  |
| Password  | the mailbox password    |

If your domain is on a different mail provider, find that provider's SMTP details and use them — the rest is the same.

### C. Fill `.env.local`

Open `.env.local` and replace the commented SMTP block:

```env
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_USER="noreply@your-domain.com"
SMTP_PASS="<the mailbox password>"
EMAIL_FROM="merxylab <noreply@your-domain.com>"
```

Then restart `npm run dev` so the new env is loaded.

### D. Test the flow

1. Visit `http://localhost:3000/signup`, sign up with a real address you own.
2. Check that address (and spam) for the verification email.
3. Click the link → `/verify?token=...&email=...` → "All set." page.
4. Sign in at `/signin` with the same email + password.

### E. If no SMTP yet — manual verification

If you want to test before SMTP is ready:

```bash
mysql -u root -p"$MYSQL_PASS" -e "
USE \`merxylab-store\`;
UPDATE users SET email_verified = NOW() WHERE email = 'YOU@example.com';
"
```

Then sign in normally. The dev server logs the would-be verification email to the console — copy the link from there if you still want to click through.

### F. Security notes

- Never commit `.env.local`. It is already in `.gitignore`.
- Use a unique mailbox password — do not reuse account passwords.
- Hostinger SMTP has rate caps on shared plans (commonly ~300 emails/hour). For real campaigns later, integrate a provider like Resend or Postmark — leave Hostinger for transactional traffic only.

---

## 2. Google OAuth

### A. Create OAuth client in Google Cloud Console

1. Open [console.cloud.google.com](https://console.cloud.google.com/).
2. Top-left project picker → **New Project** → name it `merxylab` → Create.
3. Sidebar → **APIs & Services** → **OAuth consent screen**.
   - User Type: **External**.
   - App name: `merxylab`.
   - User support email: your email.
   - Developer contact: your email.
   - Scopes: leave defaults (Google adds `userinfo.email`, `userinfo.profile`, `openid` automatically — those are what we need).
   - Test users: add your own email while in "Testing" mode.
   - Save & continue through each step.
4. Sidebar → **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: `merxylab-local` (or whatever).
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - (later) `https://your-domain.com`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - (later) `https://your-domain.com/api/auth/callback/google`
   - Create.
5. Google shows a dialog with **Client ID** and **Client secret**. Copy both.

### B. Fill `.env.local`

```env
AUTH_GOOGLE_ID="<the client id, ends in .apps.googleusercontent.com>"
AUTH_GOOGLE_SECRET="<the client secret>"
```

Restart `npm run dev`. The signin page automatically shows the "Continue with Google" button once these env vars are present (`hasGoogle` flag in `src/lib/auth.ts`).

### C. Test

1. Visit `/signin`.
2. Click **Continue with Google**.
3. Pick your Google account → consent.
4. Land back on `/account` signed in.

If the redirect fails, double-check the redirect URI in step A.4 matches **exactly** (including `http` vs `https` and trailing slash absence).

### D. Going to production

- Add the production origin + redirect URI to the same OAuth client.
- Update `AUTH_URL` to the production URL in production env.
- When ready for non-test users, on the OAuth consent screen click **Publish app** and pass Google's verification (only needed for sensitive scopes; default scopes here usually go through quickly).

---

## 3. Bank payment instructions

Order confirmation emails and `/order/[id]` use the `BANK_PAYMENT_INSTRUCTIONS` env block. Edit it in `.env.local`:

```env
BANK_PAYMENT_INSTRUCTIONS="KBZ Bank · Account: 0000-0000-0000 · Beneficiary: merxylab Co · Reference: {orderId}"
```

The literal token `{orderId}` is replaced with the server-generated UUID at send time and again on the confirmation page. Customers use that as the bank-transfer reference so payment reconciliation is easy.

Multi-line strings work — quote the whole thing and use `\n` for line breaks:

```env
BANK_PAYMENT_INSTRUCTIONS="KBZ Bank\nAccount: 0000-0000-0000\nBeneficiary: merxylab Co\nReference: {orderId}"
```

---

## 4. Smoke test checklist (all wired)

After SMTP + Google OAuth + bank text are set:

- [ ] `npm run dev` runs without warnings about missing env.
- [ ] `/signup` with a real email lands a verification email.
- [ ] The verify link flips `users.email_verified` and shows "All set."
- [ ] `/signin` (credentials) lands on `/account`.
- [ ] `/signin` → **Continue with Google** lands on `/account`.
- [ ] Add a product to cart → `/checkout` → place order → email arrives with bank instructions including the order UUID as `Reference`.
- [ ] `/account/orders/[id]` shows the order with `pending_payment` status.
- [ ] In Drizzle Studio (`npm run db:studio`) flip `orders.status` to `paid` → reload `/account/orders` shows the new status label.
