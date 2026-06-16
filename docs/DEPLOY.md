# DEPLOY — Hostinger Business shared (Node.js + MySQL + SMTP)

End-to-end deploy from local to your Hostinger Business plan. Single host runs the Next.js app (via Phusion Passenger), MySQL, and SMTP.

`next.config.ts` already has `output: 'standalone'` so the build produces a minimal runtime tree.

---

## 0. Prereqs

- Hostinger Business plan with a domain attached.
- SSH access enabled (hPanel → Advanced → SSH Access).
- Node.js 20+ available (hPanel → Advanced → Node.js).
- MySQL database created (hPanel → Databases → MySQL Databases).
- SMTP mailbox set up (see `docs/AUTH-SETUP.md`).
- Google OAuth client set up (optional, see `docs/AUTH-SETUP.md`).
- Local repo at the version you want to ship; `npm run build` runs clean.

---

## 1. Create production MySQL database

In hPanel:
1. Databases → **MySQL Databases** → **Create new database**.
2. Database name: `merxylab-store` (or similar).
3. Username: `merxylab` (or similar — do **not** use `root` in prod).
4. Password: generate a strong unique one. Save it in your password manager.
5. After creation, hPanel shows the host (usually `localhost`) and assigned port (often `3306`).

Note: hyphen in `merxylab-store` requires backticks in raw SQL. Drizzle handles this fine via the connection URL.

---

## 2. Push schema to prod MySQL

Two options. Pick **A** for simplicity (run migrations from your laptop pointed at prod).

### A. Remote migrate from local
1. Enable remote MySQL in hPanel → Databases → Remote MySQL. Whitelist your laptop's IP.
2. On your laptop, point Drizzle at prod:
   ```bash
   DATABASE_URL="mysql://merxylab:PROD_PASSWORD@PROD_HOST:3306/merxylab-store" \
     npm run db:migrate
   ```
3. Seed if you want catalog data immediately:
   ```bash
   DATABASE_URL="mysql://merxylab:PROD_PASSWORD@PROD_HOST:3306/merxylab-store" \
     npm run db:seed
   ```
4. **Disable remote MySQL after** to reduce surface. Only re-enable for ad-hoc admin.

### B. SSH + on-host migrate
1. SSH to host: `ssh user@your-domain.com`.
2. Clone the repo to a build dir (`~/build/merxylab-store`).
3. Install deps + run migrations from there with the prod `DATABASE_URL` exported.

---

## 3. Prepare the Node.js app slot in hPanel

1. hPanel → Advanced → **Node.js** → **Create application**.
2. Settings:
   - **Node.js version**: 20.x (or latest 20 available).
   - **Application mode**: Production.
   - **Application root**: `domains/your-domain.com/public_html/merxylab` (or whichever path you want — pick something **outside** `public_html` if you don't want files served raw; Passenger maps the app port to the domain regardless).
   - **Application URL**: `your-domain.com` (or a subdomain).
   - **Application startup file**: `server.js`.
3. Click Create. hPanel allocates a port internally and routes the domain to it via Passenger.

---

## 4. Build locally + upload artifact

Build is small thanks to `output: 'standalone'`.

```bash
# from project root
npm ci
npm run build
```

This produces `.next/standalone/` (the minimal runtime) plus `.next/static/` and `public/`.

Bundle for upload:

```bash
mkdir -p deploy
cp -r .next/standalone/. deploy/
cp -r public deploy/public
cp -r .next/static deploy/.next/static
# copy migrations + seed inputs in case you re-run on host:
cp -r src/db/migrations deploy/db-migrations
cp -r src/data deploy/src-data
```

The standalone build embeds `node_modules` it actually uses. The startup file is `deploy/server.js`.

Upload via:

```bash
rsync -avz --delete deploy/ user@your-domain.com:/home/user/domains/your-domain.com/merxylab/
```

(Adjust the remote path to match the **Application root** you chose in step 3.)

---

## 5. Configure env vars in hPanel

hPanel → Node.js → your app → **Environment variables**. Add each as a separate row:

| Key                       | Value                                                                 |
|---------------------------|-----------------------------------------------------------------------|
| `NODE_ENV`                | `production`                                                          |
| `DATABASE_URL`            | `mysql://merxylab:PROD_PASSWORD@localhost:3306/merxylab-store`        |
| `AUTH_SECRET`             | output of `openssl rand -base64 32` — **fresh, not dev secret**       |
| `AUTH_URL`                | `https://your-domain.com`                                             |
| `AUTH_TRUST_HOST`         | `1`                                                                    |
| `AUTH_GOOGLE_ID`          | from Google Cloud (optional)                                          |
| `AUTH_GOOGLE_SECRET`      | from Google Cloud (optional)                                          |
| `SMTP_HOST`               | `smtp.hostinger.com`                                                  |
| `SMTP_PORT`               | `465`                                                                 |
| `SMTP_USER`               | `noreply@your-domain.com`                                             |
| `SMTP_PASS`               | mailbox password                                                      |
| `EMAIL_FROM`              | `merxylab <noreply@your-domain.com>`                                  |
| `BANK_PAYMENT_INSTRUCTIONS` | your bank line w/ `{orderId}` token                                  |
| `NEXT_PUBLIC_SITE_URL`    | `https://your-domain.com`                                             |

Click **Save**. hPanel restarts Passenger.

Sanity check secrets — `AUTH_SECRET` must be a fresh value generated for prod. **Never reuse the dev `AUTH_SECRET` or dev MySQL password**.

---

## 6. Wire SSL (free Let's Encrypt)

1. hPanel → SSL → **Install certificate** for `your-domain.com` and `www.your-domain.com`.
2. Enable **Force HTTPS** so requests always use TLS.

OAuth callback URLs in Google Cloud must use `https://your-domain.com/api/auth/callback/google`.

---

## 7. Add Google OAuth production redirect

Repeat the steps in `docs/AUTH-SETUP.md` section 2.A.4, adding to the same OAuth client:
- Authorized origins: `https://your-domain.com`
- Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`

If the OAuth consent screen is still in **Testing** mode, click **Publish app** for production users to sign in without being on the test-user list.

---

## 8. Photos: upload to host

Photos live in `public/products/{slug}/{01-04}.webp` on the running app's filesystem. On Hostinger Node deployments the `public/` folder ships with the app, so:

```bash
# from your local repo, after dropping new photos
npm run photos:check
rsync -avz public/products/ user@your-domain.com:/home/user/domains/your-domain.com/merxylab/public/products/
```

You can also use hPanel's File Manager to drop files into the same path — just remember to re-run `npm run photos:check` locally **and** re-deploy `src/data/products.json` so `hasPhotos` updates land in seed source.

To re-sync the `has_photos` column in the live DB after dropping photos:
```bash
DATABASE_URL="mysql://merxylab:PASS@PROD_HOST:3306/merxylab-store" npm run db:seed
```
(Re-seed reinserts catalog rows from `products.json` — only run when you intentionally want to overwrite catalog state. To update only `has_photos` in place, do it via Drizzle Studio or a one-off SQL `UPDATE`.)

---

## 9. First boot smoke test

After hPanel restarts the Node app:

1. Visit `https://your-domain.com/` → homepage loads with MMK prices.
2. `/shop`, `/product/mxk-65-walnut` → catalog from prod DB.
3. `/signup` with a real email → verification email lands.
4. Sign in → `/account` accessible.
5. Add to cart → `/checkout` → place order → `/order/[id]` shows bank instructions; email arrives.
6. `npm run db:studio` locally against prod (via SSH tunnel) shows the new order row.

If a step fails, hPanel → Node.js → app → **Logs** has stdout/stderr.

---

## 10. Drizzle Studio against prod (safely)

Studio should **never** be exposed publicly. Tunnel it:

```bash
ssh -L 3307:127.0.0.1:3306 user@your-domain.com
# in another terminal:
DATABASE_URL="mysql://merxylab:PASS@127.0.0.1:3307/merxylab-store" npm run db:studio
```

This forwards your laptop's `localhost:3307` to the host's MySQL through SSH. Open `https://local.drizzle.studio` as normal.

---

## 11. Backup

hPanel → Files → **Backups** has daily auto-backup on Business plans. Add a weekly off-host mysqldump for belt-and-braces:

```bash
# crontab on host (hPanel → Advanced → Cron Jobs), weekly:
0 3 * * 0 mysqldump --no-tablespaces -u merxylab -p"PASS" \`merxylab-store\` | gzip > ~/backups/merxylab-$(date +\%F).sql.gz
```

Keep at least 4 weekly backups before rotating.

---

## 12. Rolling updates

For each new release:

```bash
git pull
npm ci
npm run build
npm run db:generate          # if schema changed
DATABASE_URL=... npm run db:migrate
# rebuild deploy bundle
rsync -avz --delete deploy/ user@your-domain.com:/home/user/domains/your-domain.com/merxylab/
# hPanel → Node.js → app → Restart
```

Migrations should always be backward-compatible during the window between the old runtime and the new runtime starting up. If a migration is destructive (drop column), ship in two steps: deploy code that no longer references the column, then a follow-up migration that drops it.

---

## 13. Observability + alerts

- Vercel-style analytics not available — use Hostinger access logs (`logs/access.log`).
- For app errors, write to stdout (`console.error`); Passenger captures stdout in **Node.js → Logs**.
- For uptime, point an external monitor (UptimeRobot free tier) at `https://your-domain.com/`.
- Future: drop Sentry SDK in for tracebacks if traffic warrants.

---

## 14. Smoke checklist after deploy

- [ ] HTTPS green (SSL active, force-https on).
- [ ] Homepage Lighthouse mobile perf > 90.
- [ ] Sign-up email arrives within 60s.
- [ ] Google OAuth lands on `/account`.
- [ ] Cart persists across reload (cookie).
- [ ] Place order → email sent → `/order/[id]` shows bank ref.
- [ ] Drizzle Studio (via SSH tunnel) shows expected rows.
- [ ] hPanel auto-backup is enabled and ran in the last 24h.
- [ ] No secrets in stdout logs.
