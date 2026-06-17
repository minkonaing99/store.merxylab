# SETUP — merxylab store

## Setup

### Prerequisites
- **Node.js** ≥ 20.0.0
- **npm** ≥ 10 (project standardised on npm — see TECH ADR-09. Hostinger's corepack chokes on pnpm 11.)
- **MySQL** ≥ 8.0 (Phase 5+) — local dev with `root` user, default port 3306
- **cwebp** (libwebp) — for converting product photos to WebP (`brew install webp`)
- Git
- A modern browser (Chromium, Firefox, Safari)

### Install steps
```bash
# Clone (when repo exists)
git clone <repo-url> merxylab-store
cd merxylab-store

# Install dependencies
npm install

# Run dev server
npm run dev
# → http://localhost:3000
```

### Env vars
Placeholder phase has **no required env vars**. The catalog is inlined as JSON.

**Phase 5+** uses `.env.local` (gitignored). A committed `.env.example` lists all keys with empty values.

| Key | Description | Required from phase |
|-----|-------------|---------------------|
| `DATABASE_URL` | `mysql://root:Tkhantiang1@localhost:3306/merxylab` (local dev only) | 5 |
| `AUTH_SECRET` | NextAuth JWT secret — generate via `openssl rand -base64 32` | 6 |
| `AUTH_URL` | Canonical site URL (`http://localhost:3000` dev) | 6 |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | 6 |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | 6 |
| `SMTP_HOST` | Hostinger SMTP (`smtp.hostinger.com`) | 6 |
| `SMTP_PORT` | `465` (TLS) | 6 |
| `SMTP_USER` | Mailbox username (e.g. `noreply@your-domain.com`) | 6 |
| `SMTP_PASS` | Mailbox password from hPanel | 6 |
| `EMAIL_FROM` | Display From: header (e.g. `merxylab <noreply@your-domain.com>`) | 6 |
| `BANK_PAYMENT_INSTRUCTIONS` | Plain-text block included in order confirmation emails | 6 |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL exposed to client (sitemap, OG) | 3 |
| `UPSTASH_REDIS_REST_URL` | Optional rate-limit backend; falls back to in-memory if unset | 7 |
| `UPSTASH_REDIS_REST_TOKEN` | Pair to URL | 7 |

**Never commit `.env.local`. Never reuse the dev MySQL password (`Tkhantiang1`) in production.**

### Local MySQL setup (Phase 5)
```bash
# install (macOS)
brew install mysql
brew services start mysql

# secure + set root password
mysql_secure_installation
# pick: yes / Tkhantiang1 / yes / yes / yes / yes

# create database
mysql -u root -p
# at the prompt:
CREATE DATABASE merxylab CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
EXIT;

# verify connection
mysql -u root -p merxylab -e "SHOW TABLES;"
```

### Database bootstrap — fresh DB via SQL (preferred for prod)
For a clean install (local or Hostinger), don't run the seed scripts — paste `docs/db-bootstrap.sql` directly:

```bash
# Local
mysql -u root -p merxylab < docs/db-bootstrap.sql

# Hostinger
# hPanel → MySQL Databases → phpMyAdmin → select `u<acct>_merxylab_store` DB → Import → upload docs/db-bootstrap.sql → Go.
```

The file is a single, idempotent-on-empty-DB script: 17 CREATE TABLEs + 18 FK constraints + 13 indexes + reference seed (15 divisions, 5 payment methods incl. KBZ Bank, 6 categories) + 15 products + 56 product_specs rows. No app code or env vars touched. Hand-maintained from `src/db/schema/*.ts` + `src/data/*.json` — if you change schema or seed JSON, regenerate the relevant sections manually.

The Drizzle-managed migration path (`npm run db:generate`, `npm run db:migrate`, `npm run db:push`) is still wired and works on already-seeded DBs, but is **not** the recommended deploy path — Hostinger's phpMyAdmin paste is simpler and avoids dragging drizzle-kit's dev deps near prod.

The tail of `db-bootstrap.sql` also documents the **stock-commit model** (0.13.6+) and includes a commented-out one-off **"release phantom-held stock"** SQL block for any DB that ran on the pre-0.13.6 order code. Uncomment + run that block once on prod if upload-failures left orders stuck in `pending_payment` / `payment_submitted` with stock decremented but never confirmed. Skip on fresh DBs.

### Granting admin role
After the first signup (admin user creates a normal account via the signup flow), promote the user via SQL — there is no UI escalation path by design:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Run from phpMyAdmin → SQL tab. Verify with `SELECT id, email, role FROM users WHERE role='admin';`. From then on `/admin/*` UI + `/api/v1/admin/*` routes accept the session.

### Setting up Cloudflare R2
Required from 0.14.0+ for product photo / payment QR / slip uploads. See TECH ADR "Photos on Cloudflare R2".

1. **Create two buckets** in the Cloudflare R2 dashboard:
   - `merxylab-public` — for product photos + payment-method QR codes. Reads must be public.
   - `merxylab-private` — for customer payment slips. No public binding.
2. **Bind a custom domain** to `merxylab-public`: R2 dashboard → bucket → Settings → Custom domains → `cdn.merxylab.com` (or whatever subdomain you own under CF DNS). This becomes `NEXT_PUBLIC_CDN_URL`.
3. **Create an API token** (R2 → Manage R2 API Tokens). Scope to both buckets, permissions: Object Read + Write + Delete. Capture `Access Key ID`, `Secret Access Key`, and your `Account ID` (URL bar in the R2 dashboard).
4. **Populate `.env.local`** (or hPanel → Easy Deploy → env vars on Hostinger):
   ```
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_PUBLIC_BUCKET=merxylab-public
   R2_PRIVATE_BUCKET=merxylab-private
   NEXT_PUBLIC_CDN_URL=https://cdn.merxylab.com
   ```
5. **Rotate the API token every 90 days** along with `AUTH_SECRET` and SMTP creds.

Smoke test after deploy:
- `/admin/products` → upload one product photo → page render should load both 1600px hero and 600px thumb via `cdn.merxylab.com/products/<slug>/...`.
- `/admin/payment-methods` → upload one QR → order page renders via CDN.
- Place a test order, upload a slip → confirm `/api/v1/orders/<id>/slip` streams the image (200 image/webp) for the owner + admin, 403 / 404 for anyone else.

### Photo workflow (Phase 4)
Photos live in `public/products/{slug}/{NN}.webp`, slot 01 required for `hasPhotos = true`.

```bash
# 1. Drop original photos into the slug folder
mv ~/Downloads/mxk-keyboard-*.jpg public/products/mxk-65-walnut/

# 2. Convert to WebP (quality 82, ≤200KB, max 1600px long edge)
cd public/products/mxk-65-walnut
cwebp -q 82 -resize 1600 0 mxk-keyboard-1.jpg -o 01.webp
cwebp -q 82 -resize 1600 0 mxk-keyboard-2.jpg -o 02.webp
# etc — up to 04.webp

# 3. Clean up originals
rm *.jpg

# 4. Regenerate hasPhotos flags
npm run photos:check
```

### How to run locally
```bash
npm run dev               # dev server with HMR
npm run build             # production build
npm run start             # serve production build
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm test              # vitest
npm run test:e2e          # playwright
npm run format            # prettier write

# Phase 4
npm run photos:check      # scan public/products/*/01.webp → set hasPhotos

# Phase 5
npm run db:generate       # drizzle-kit generate (from schema diffs)
npm run db:migrate        # apply pending migrations
npm run db:studio         # open Drizzle Studio admin UI (local only)
npm run db:seed           # populate from src/data/*.json

# Phase 6
npm run email:dev         # react-email preview server on :3030
```

### Common errors + fixes
- **`Module not found: Can't resolve '@/...'`** — Ensure `tsconfig.json` `paths` maps `@/*` to `./src/*`.
- **`Failed to compile. <some Tailwind utility>`** — Tailwind v4 expects all sources scanned via `@source` in CSS or `content` in config; verify `src/**/*.{ts,tsx}` is included.
- **Hydration mismatch on cart drawer** — Cart state reads from localStorage; render shell server-side, hydrate qty client-side only (`useEffect` guard).
- **Fonts flashing** — Confirm `next/font/google` is imported in `app/layout.tsx`, not a client component.
- **`ECONNREFUSED 3306`** — MySQL not running. `brew services start mysql`.
- **`ER_NOT_SUPPORTED_AUTH_MODE`** — older mysql2 + MySQL 8 auth plugin mismatch. Switch user to `mysql_native_password` or upgrade mysql2.
- **`AUTH_SECRET missing`** — generate via `openssl rand -base64 32` and put in `.env.local`.
- **SMTP timeout** — confirm port 465 (TLS) on Hostinger; some ISPs block 25/587.
- **Drizzle Studio won't open** — needs `DATABASE_URL` set in `.env.local`; runs at `https://local.drizzle.studio`.

---

## Testing

### Framework + runner
- **Vitest** — unit + integration tests (fast, ESM-native, Jest-compatible API).
- **Testing Library (React)** — component tests.
- **Playwright** — E2E.

### Coverage target
**80%+ statements + branches.** Enforced via `vitest --coverage` threshold in CI.

### Test types required
1. **Unit** — utilities (`formatPrice`, `slugify`), cart store reducers, search index builder.
2. **Integration** — homepage sections render with real JSON data; cart drawer mounts and updates on store action; search route filters correctly.
3. **E2E** — critical flows from `docs/PRD.md`:
   - Browse → add to cart → view cart → refresh → cart persists
   - Category filter
   - Search → click result → PDP
   - Newsletter visual submit → toast
   - Empty cart state

### TDD workflow
**RED → GREEN → REFACTOR.**
1. Write the failing test first (clear assertion, descriptive name).
2. Run it — it must fail.
3. Write the minimum code to pass.
4. Run it — it must pass.
5. Refactor with tests as safety net.
6. Verify coverage ≥ 80%.

### How to run tests
```bash
npm test              # vitest run (watch mode off)
npm run test:watch        # vitest watch
npm run test:coverage     # vitest --coverage
npm run test:e2e          # playwright test
npm run test:e2e:ui       # playwright test --ui
```

### How to write new tests
- Co-locate unit tests next to source: `cart-store.test.ts` next to `cart-store.ts`.
- Component tests in `__tests__/` adjacent to component.
- E2E specs in `e2e/` at repo root.
- Use Testing Library queries by accessible role first (`getByRole`), text second, test-id only as last resort.
- One assertion per test where reasonable; group related assertions in `describe` blocks.

### Mocking strategy
- **Cart store:** test against real store; reset between tests via `cart-store.getState().reset()`.
- **Fuse.js search:** test against real index with a small fixture catalog.
- **Toast (sonner):** mock the `toast()` call to assert invocation without rendering noise.
- **Next.js `useRouter`:** mock via Vitest mock in `vitest.setup.ts`.
- **localStorage:** Vitest's jsdom provides it; clear in `beforeEach`.

---

## Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: SemVer.

### [0.14.0] — 2026-06-17 (shipped to testing)
- All admin-uploaded media (product photos, payment-method QRs, customer slips) now stored in Cloudflare R2 instead of the Hostinger filesystem. Easy Deploy's build-frozen `public/` made runtime disk writes silently invisible; R2 sidesteps the hosting model entirely. See TECH ADR "Photos on Cloudflare R2 (supersedes 'Photos on filesystem')".
- Two buckets: `merxylab-public` (products + QR, served via `cdn.merxylab.com` custom domain) and `merxylab-private` (slips, streamed back through the existing `GET /api/v1/orders/[id]/slip` route).
- New env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, `NEXT_PUBLIC_CDN_URL`. See `.env.example` and the new "Setting up Cloudflare R2" section below.
- New module: `src/lib/r2.ts` (`putPublic`/`putPrivate`/`deletePublic`/`deletePrivate`/`getPrivateBytes`) and `src/lib/cdn.ts` (`r2PublicUrl` — accepts R2 keys OR legacy disk paths, builds a fully-qualified URL using `NEXT_PUBLIC_CDN_URL`).
- Routes rewired: `POST /api/v1/admin/products/[id]/photos/[slot]` (parallel hero + thumb PutObject), `POST /api/v1/admin/payment-methods/qr` (also adds a `DELETE` companion), `POST /api/v1/orders/[id]/slip` (PutObject to private bucket), `GET /api/v1/orders/[id]/slip` (`GetObject` from R2 after auth check). `products.has_photos` no longer relies on `readdir`; the slot-01 mutation in each route sets it directly.
- DB stores R2 keys (not URLs) in `payment_methods.qr_image_url` and `orders.payment_proof_url`. Render sites pass values through `r2PublicUrl()` server-side before handing them to client components. Legacy `/path/file.webp` values still resolve unchanged.
- `next.config.mjs` adds `images.remotePatterns` for the CDN host so `<Image>` accepts the external src.
- Deleted: `src/lib/slip-storage.ts` (was disk-based path resolver).

### [0.13.8] — 2026-06-17 (shipped to testing)
- Cut customer email count from 6 → 2 per happy-path order.
  - Dropped: `order-placed`, `slip-received`, `order-paid`, `order-shipped` templates. No longer sent.
  - Added: `order-invoice.tsx` (sent at admin → `paid`/`confirmed` with itemised totals + payment method — replaces both the placement email and the bare "payment received" email) and `order-delivered.tsx` (sent at admin → `delivered`).
- Owner mailbox unchanged: `new-order-alert`, `slip-submitted-alert`, `low-stock-alert` still fire as before (the operational signal lives there).
- `docs/PAYMENT.md` "Customer alerts" rewritten.

### [0.13.7] — 2026-06-17 (shipped to testing)
- Bootstrap fix: product seed now ships `has_photos = 0` for every row. Previous bootstraps wrote 1 unconditionally, which made `next/image` 500 on the missing `/products/<slug>/01-thumb.webp` files in any fresh deploy. Owner upload via `/admin/products` flips the flag back to 1 per-product via `syncHasPhotos()`. Maintenance SQL block added to `db-bootstrap.sql` for prod DBs already seeded with the wrong value.
- Wallet slip upload UI: the bare native `<input type="file">` rendered nearly invisible on the cream surface. Replaced with hidden-input-plus-styled-label pattern + filename readout, matching the admin photo grid. Same JPG/PNG/WEBP/8MB constraints, just a button you can actually see.

### [0.13.6] — 2026-06-17 (shipped to testing)
- Stock commit moves to payment confirmation, not order placement. Closes the "ghost reservation" failure mode where checkout decremented stock but slip upload 500'd (e.g. during the sharp/libvips outage) leaving items stuck.
  - `POST /api/v1/orders` now does a read-only `stockQty >= qty` snapshot check per line and returns 409 `OUT_OF_STOCK` if any line fails — **no UPDATE on `products`**. Order row is inserted in `pending_payment` with no inventory side effects.
  - `PATCH /api/v1/admin/orders/[id]` now performs the decrement transactionally when transitioning to `paid` (wallet flow) or `confirmed` (COD flow), with a `stockQty >= qty` guard per line; admin gets 409 `OUT_OF_STOCK` if anything was oversold in the race window. Cancelling out of `paid`/`confirmed` restores stock.
  - `POST /api/v1/orders/[id]/cancel` and `scripts/cancel-expired-orders.ts` no longer touch stock — pending orders never held any.
  - `LowStockAlert` email now fires on payment-confirmation (where the deduction actually happens), not at order placement.
- DB reset SQL for prod (one-off cleanup of phantom pending orders from the sharp-500 era) is in `docs/db-bootstrap.sql` under "Maintenance: release phantom-held stock + cancel stuck orders". Uncomment + paste into phpMyAdmin to release held stock + cancel stuck orders. Skip on fresh DBs.
- TECH.md "Stock oversell" + Phase 9 ADR consequences updated. SCHEMA.md endpoint descriptions for POST `/orders`, POST `/orders/[id]/cancel`, and the order-status flow section updated.

### [0.13.5] — 2026-06-17 (shipped to production)
- `sharp` ^0.35.1 → ^0.34.5. Hostinger CloudLinux glibc is below the 2.28 floor sharp 0.35's libvips 8.18 needs (`ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3`), so every upload route (product photo, slip, QR) 500'd through Passenger as an hPanel gateway error. Sharp 0.34.5 bundles libvips 8.17.3 (per `@img/sharp-libvips-* 1.2.4`) which CloudLinux satisfies. Lockfile regenerated; `@img/sharp-linux-*` variants are now recorded so Hostinger's `npm install --omit=dev` resolves linux binaries from a darwin-generated lockfile. Stale `allowScripts` entries for esbuild 0.18/0.25 and sharp 0.35 trimmed.

### [0.13.4] — 2026-06-17 (docs only)
- Doc sweep: replaced every stale `pnpm` command with `npm` equivalents across SETUP, DEPLOY, PLAN, AUTH-SETUP, LIGHTHOUSE, TECH (project standardised on npm — TECH ADR-09). Historical mentions inside ADRs + Phase 1.1 scaffold notes left as-is.
- Slip storage references corrected in SCHEMA, PAYMENT, TECH ADR-Phase-9 consequences, PLAN Phase 9.8 task: now point at `<repo>/private-uploads/slips/<orderId>/<uuid>.webp` + the streaming `GET /api/v1/orders/[id]/slip` route. Stale `public/slips/...` text removed.
- SCHEMA.md endpoints table gains a row for `GET /api/v1/orders/[id]/slip`.
- SETUP.md adds a "Database bootstrap — fresh DB via SQL" section: paste `docs/db-bootstrap.sql` into phpMyAdmin (or `mysql <` locally) for a fresh install. Recommended path over `npm run db:seed` for prod deploys.
- `docs/db-bootstrap.sql` header rewritten — drops reference to deleted `scripts/dump-sql.ts`; file is now hand-maintained from `src/db/schema/*.ts` + `src/data/*.json`.

### [0.13.3] — 2026-06-17 (shipped to testing)
- Disk-only hardening pass (no R2 yet — see TECH.md decision).
- **Slips moved out of `public/`.** New storage path: `<repo>/private-uploads/slips/<orderId>/<uuid>.webp` (gitignored). `orders.payment_proof_url` now stores the bare basename, not a path. Existing rows with legacy `/slips/<id>/<uuid>.webp` values still resolve via `slipBasenameFrom()` which strips to basename.
- New route: `GET /api/v1/orders/[id]/slip` — auth-gated (order owner OR admin), reads from `private-uploads/`, streams `image/webp` with `Cache-Control: private, no-store`. Replaces the static `/slips/...` URL that previously lived under `public/`.
- `src/lib/slip-storage.ts` centralises slip path resolution + basename validation.
- `next.config.mjs` adds long-lived cache headers: `/products/:path*` → `public, max-age=31536000, immutable` (admin UI cache-busts on replace via `?v=`), `/payment-qr/:path*` → `public, max-age=2592000` (30d). Single biggest perf win without a CDN.
- `src/app/order/[id]/page.tsx` slip render now points at the streaming route, not the public path.

### [0.13.2] — 2026-06-17 (shipped to testing)
- Security audit: patched all outstanding HIGH/MEDIUM npm-audit findings. `npm audit` now reports **0 vulnerabilities** (was 9: 2 high, 5 moderate, 2 low).
- `package.json` deps:
  - `next-auth` `5.0.0-beta.25` → `5.0.0-beta.31` (closes `GHSA-5jpx-9hw9-2fx4` email misdelivery).
  - `eslint` `9.17.0` → `9.39.4` (closes `GHSA-xffm-g5w8-qvg7` plugin-kit ReDoS).
- `package.json` overrides:
  - `esbuild: ^0.28.1` forces drizzle-kit's nested `@esbuild-kit/core-utils` off vulnerable esbuild (`GHSA-gv7w-rqvm-qjhr` RCE via NPM_CONFIG_REGISTRY + `GHSA-67mh-4wv8-2f99` dev-server SSRF). Dev-only path, but cleaned up.
  - `next > postcss: ^8.5.10` forces next's bundled postcss off `GHSA-qx2v-qp2m-jg93` CSS stringify XSS.
- `next.config.mjs` CSP tightened: production `script-src` drops `'unsafe-eval'`. Dev keeps `'unsafe-eval'` for HMR/React Refresh. `'unsafe-inline'` still present pending nonce middleware (deferred).
- typecheck ✅, build ✅. Held with Phase 10 — production push pending owner smoke-test.

### [0.13.1] — 2026-06-17 (shipped to testing)
- `refactor-clean` pass:
  - Deleted unused `scripts/dump-sql.ts` (docs/db-bootstrap.sql already shipped).
  - Unexported `EMAIL_REGEX` + `PHONE_REGEX` in `src/lib/validators.ts` — used only internally by `isEmail`/`isMyanmarPhone`.
- knip + depcheck residuals reviewed; remaining hits are false positives (Tailwind v4 PostCSS pipeline, React 19 types, Next lint deps, tsconfig path alias `@emails/*`, React Email default exports kept by convention).

### [0.13.0] — 2026-06-17 (shipped to testing)
- Phase 10 implemented and pushed to `testing` + `main` at `6bb7623`. Production held until owner smoke-tests.
- New endpoints: `POST /api/v1/admin/products`, extended `PATCH /api/v1/admin/products/[id]` with specs REPLACE, `POST` and `DELETE /api/v1/admin/products/[id]/photos/[slot]`. `sharp` dual-resize per upload: 1600×1600 hero + 600×600 thumb, EXIF stripped. Rate-limit 30/hr/admin on photo uploads.
- New lib: `src/lib/slugify.ts` (lowercase + diacritic strip + non-alnum to `-` + slice to 80; exports `SLUG_REGEX`).
- New UI: `+ New product` button at top of `/admin/products` opens `ProductDetailsForm` inline. Each existing row gets two expand buttons — `Edit details` + `Edit photos`. Save / Discard pair per expanded section, no auto-save.
- `ProductDetailsForm`: name → auto-slug (only while user hasn't customised it; slug is read-only in edit mode); category select; price MMK; tagline; description; swatch via `<input type="color">` + hex input; stock + threshold; active/featured toggles; dynamic specs editor (`+ row` / trash).
- `ProductPhotoGrid`: 4 fixed slots (01..04). Each cell shows the 600px thumb over the swatch-tinted background (cache-busted via `?v=`). Per-slot Replace + Remove. Client validates file type + size before sending.
- Render: `<Tile>` got a `useThumb` prop (default true for grid contexts). Hero + PDP gallery swatch-only fallback opt in to `useThumb={false}`. PDP gallery thumb strip switched to `0X-thumb.webp`.

### [0.12.0] — 2026-06-16 (docs only — implementation pending)
- Phase 10 design locked: inline product CRUD + photo pipeline on `/admin/products`.
- Adds `+ New product` button opening `ProductDetailsForm` with name → auto-slug, category select, price, tagline, description, swatch (native color picker), stock + threshold, featured/active toggles, and a dynamic specs editor (key/value rows).
- Each row gets two expand buttons: **Edit details** + **Edit photos** (4-slot grid 01..04 with per-slot Replace + Remove).
- Save / Discard pair per expanded section — no auto-save.
- Photo pipeline: client validates JPG/PNG/WEBP ≤ 10 MB; server `sharp` produces 1600×1600 hero + 600×600 thumb WEBP per slot, EXIF stripped. Stored under `public/products/<slug>/0X.webp` + `0X-thumb.webp`.
- Soft delete only (`is_active = false`).
- Doc updates: `PRD.md` (4 new owner stories), `TECH.md` (new ADR: inline product CRUD + dual-resize photo pipeline), `SCHEMA.md` (new admin endpoints for products + photos, rate-limit row), `DESIGN.md` (rewritten `AdminProductTable` + new `ProductDetailsForm` + `ProductPhotoGrid`), `PLAN.md` (Phase 10.1–10.10 tasks).
- Backlog: drag-to-reorder photos within `ProductPhotoGrid`.

### [0.11.0] — 2026-06-16
- Phase 9.x patch series shipped to `production`:
  - Form validation across `/signin`, `/signup`, `/account/addresses`, `/checkout`: per-field error messages on blur, red border + helper text, required-asterisk indicators, Myanmar phone regex `+959XXXXXXXXX`, password strength rule (≥10 + mixed case + digit). New shared `TextField` / `SelectField` / `TextAreaField` in `src/components/ui/field.tsx` backed by `src/lib/validators.ts`.
  - `/admin/payment-methods` switched from auto-save-on-blur to per-row Save / Discard. Pending QR file held client-side as object-URL preview, uploaded on Save. Atomic sequence: QR upload → field PATCH → local commit.
  - QR is now optional. Server filter at `/api/v1/payment-methods` requires only `account_name + account_phone`. `/order/[id]` wallet panel hides the QR slot when empty and lets account info span full width.
  - Sort order swapped from free-form number input to `<select>` 1..5 on both wallet and COD rows.
  - Added `KBZ Bank` (id `kbz_bank`, kind `wallet`) as a 5th method. Treats `account_phone` field as the bank account number. Run once on prod DB: `INSERT INTO payment_methods (id, name, kind, sort_order, is_active) VALUES ('kbz_bank', 'KBZ Bank', 'wallet', 5, 0);`.
  - Checkout UI: `+ Add new address` and "Continue to payment" buttons no longer overlap on the delivery step. Continue button has its own row, full-width on mobile, right-aligned on desktop. Payment step back/continue stack on mobile, space-between on desktop.

### [0.10.0] — 2026-06-16 (docs only — implementation pending)
- Phase 9 design locked: multi-method checkout (KBZ Pay / Aya Pay / UAB Pay / COD), in-app slip upload, BeeExpress per-division shipping, Telegram owner alerts, 24h auto-cancel.
- Doc updates: `CLAUDE.md` (payment stack rewritten), `docs/PRD.md` (new user stories + 0a/0b/0c/0d app flows + constraints), `docs/TECH.md` (two new ADRs: multi-method payment + BeeExpress shipping; security additions for slip upload + auto-cancel race), `docs/SCHEMA.md` (new `payment_methods` + `divisions` tables; expanded `orders.status` enum + new `orders` columns; rebuilt `addresses` for Myanmar shape; new public + admin endpoints), `docs/DESIGN.md` (three-step checkout component, per-status order confirmation panels, new components map), `docs/PLAN.md` (Phase 9.1–9.14 task list).
- New doc: `docs/PAYMENT.md` (owner runbook — methods, shipping table, status machine, daily ops, slip security, failure modes, env vars).
- `.env.example` extended with `TELEGRAM_BACKUP_USERNAME`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`.

### [0.9.0] — 2026-06-16
- Catalog cut to 15 curated SKUs across 6 cats (keyboards/mice/headsets/microphones/speakers/accessories). Real brand names (HyperX, Keychron, Nuphy, Logitech, Razer, VXE, Edifier, etc.). Placeholder photos copied into all 15 `public/products/<slug>/` dirs.
- Stripe integration removed (Myanmar retail = bank transfer only). Uninstalled SDK; deleted `src/lib/stripe.ts`, `/api/v1/stripe/webhook`, `/api/v1/orders/[id]/stripe-session`, `StripePayButton` from `/order/[id]`; scrubbed Stripe env keys from `.env.example`. Renamed `docs/STRIPE-AND-ADMIN.md` → `docs/ADMIN.md` with bank-transfer confirmation flow + admin promotion SQL.
- Docs scrubbed of Stripe refs: PRD (user stories, app flow, gating), TECH (ADR rewritten, security surface), SCHEMA (endpoint table, payment surface), DESIGN (order confirmation state), LIGHTHOUSE (TBT row).

### [0.8.0] — 2026-06-16
- Phase 8: React Email templates, custom `/admin` UI, Lighthouse playbook.
- Docs synced: `docs/PRD.md` (admin stories, payment flow, role gating), `docs/TECH.md` (5 new ADRs, expanded folder tree, Phase 8 security additions), `docs/SCHEMA.md` (admin endpoint tables, rate-limit table), `docs/DESIGN.md` (admin tone, KPI tiles), `docs/ADMIN.md`, `docs/LIGHTHOUSE.md`.

### [0.7.0] — 2026-06-16
- Phase 7: reviews + wishlist + newsletter + `output: 'standalone'`. `docs/AUTH-SETUP.md` + `docs/DEPLOY.md` shipped.

### [0.6.0] — 2026-06-16
- Phase 6: Auth.js v5, DB-backed cart, addresses, orders + checkout + bank-transfer confirmation, account pages.

### [0.5.0] — 2026-06-16
- Phase 5: MySQL backend via Drizzle, MMK currency, catalog APIs, stock badges.

### [0.4.0] — 2026-06-15
- Phase 4: photo folder convention + `hasPhotos` script + Gallery with fallback.

### [0.3.0] — 2026-06-15
- Phase 3: motion polish, sitemap, robots, OG metadata.

### [0.2.0] — 2026-06-15
- Phase 2: routes, cart drawer, search, checkout-less PDP.

### [0.1.0] — 2026-06-15

#### Added
- Project documentation scaffold: `docs/PRD.md`, `docs/TECH.md`, `docs/SCHEMA.md`, `docs/DESIGN.md`, `docs/PLAN.md`, `docs/SETUP.md`.
- Root `CLAUDE.md` with project rules and doc index.
- `.gitignore` with Node / Next.js / Claude entries.
- Initial design tokens (cream/ink/terracotta palette) defined in `docs/DESIGN.md`.
- Architecture decisions recorded as ADRs in `docs/TECH.md`.
- Future API contract drafted in `docs/SCHEMA.md` (placeholder phase has no live API).
- **Phase 1.1:** Next.js 15 + React 19 + TypeScript 5.7 strict scaffold (`package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `pnpm-workspace.yaml`).
- App Router shell: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
- `public/favicon.ico` + `public/logo.png` (merxylab flask + circuit-trace logo).
- **Phase 1.2-1.10:** Tailwind v4 CSS-first tokens, Fraunces + Inter via next/font, runtime deps (zustand, fuse.js, framer-motion, lucide-react, sonner, zod, clsx, tailwind-merge).
- `src/lib/types.ts` — Product, Category, CartItem, CartState, constants.
- `src/lib/utils.ts` — cn, formatPrice, slugify, clampQty.
- `src/lib/products.ts` — JSON loaders + query helpers.
- `src/lib/cart-store.ts` — zustand store with localStorage persistence.
- `src/lib/search.ts` — Fuse.js fuzzy search index.
- `src/data/products.json` — 32 products across 4 categories.
- `src/data/categories.json` — 4 categories (keyboards, mice, audio, accessories).
- **Phase 2:** All routes shipped — `/`, `/shop`, `/shop/[category]`, `/product/[slug]`, `/cart`, `/search`, `/not-found`.
- Components: Nav, Footer, CartDrawer, Hero, Stats, ProductGrid, Why, CTABanner, Newsletter, ProductCard, Tile, AddToCartButton, GridControls.
- Add-to-cart wired with toast feedback (sonner).
- 43 static pages prerendered. Build, typecheck, lint all green.
- **Phase 3 essentials:** `sitemap.xml` + `robots.txt` route handlers, Open Graph + Twitter card metadata, title template (`%s · merxylab`), `themeColor` viewport, MotionConfig with `reducedMotion="user"` honors prefers-reduced-motion globally for Framer Motion.
- Hero inline product chip polished (rounded ring, tracking tightened).
- Footer flask mark polished (proper invert filter + ring container).
- Live dev verified at http://localhost:3001 — homepage, shop, PDP, sitemap render correctly.

### [Unreleased] — Phase 4 (in progress, 2026-06-15)

#### Added
- `Product.hasPhotos: boolean` field on the Product type (required, default false).
- `PHOTO_SLOTS` and `PHOTO_BASE` constants exported from `src/lib/types.ts`.
- `public/products/{slug}/` folder for all 32 SKUs (with `.gitkeep` so git tracks them).
- `scripts/check-photos.ts` — scans `public/products/{slug}/01.webp`, updates `products.json` `hasPhotos` flag, prints summary table with extras detection.
- `npm run photos:check` script wired in `package.json`.
- `tsx` devDep for running TS scripts directly.
- `Tile` component renders `next/image` of `/products/{slug}/01.webp` when `hasPhotos=true`; warm-palette swatch fallback otherwise.
- New `Gallery` component on PDP — slots 01-04 with thumb grid, hides slots that 404 via `onError`, animated cross-fade on switch, `aria-pressed` on thumbs.
- Verified live (port 3002): photo served via `_next/image` optimizer with srcset 384-3840 widths, flag flip works end-to-end.

### [Unreleased] — Phase 5 (2026-06-16)

#### Added
- MySQL 9.6 local database `merxylab-store` (utf8mb4_0900_ai_ci collation).
- `.env.local` (gitignored) with `DATABASE_URL` and `NEXT_PUBLIC_SITE_URL`; `.env.example` committed.
- Drizzle ORM + `mysql2` driver; `drizzle.config.ts` loads `.env.local` via dotenv.
- `src/db/index.ts` — mysql2 pool singleton (10 connections, dev global cache to survive HMR).
- `src/db/schema/products.ts` — `products`, `categories`, `product_specs` tables with FKs + indexes (`idx_products_category`, `idx_products_featured`, `idx_products_is_active`, `idx_specs_product`).
- First migration `0000_grey_hellcat.sql` generated + applied.
- `scripts/seed.ts` — converts USD cents → MMK whole units (FX 2100, rounded to nearest 1,000) and seeds 4 categories + 32 products + 122 spec rows. Idempotent.
- `src/lib/money.ts` with `formatMmk` (`Ks 249,000`); replaces all `formatPrice` callers.
- `src/lib/catalog.ts` async DB-backed catalog helpers wrapped in `unstable_cache` (60s revalidate, tagged `products` + `categories`).
- `src/components/product/stock-badge.tsx` — `In stock` (success), `Only N left` (warning), `Out of stock` (muted).
- API routes: `GET /api/v1/products[?category=]`, `GET /api/v1/products/[slug]`, `GET /api/v1/categories`. Zod-validated query, structured error envelope.
- `npm run db:generate | db:migrate | db:push | db:studio | db:seed` scripts.
- `dotenv` devDep for script env loading; `server-only` runtime guard.

#### Changed
- `Product` type: dropped `currency`, added optional `stockQty` + `lowStockThreshold`. Price now means whole-unit MMK throughout.
- `src/data/products.json` — converted all 32 prices from USD cents to MMK whole units; removed `currency` field.
- Home, Shop, Category, PDP pages → async, fetch catalog from MySQL via `catalog.ts`.
- Hero, ProductGrid, Why, CTABanner refactored to accept products as props (no more module-scope JSON loads).
- `AddToCartButton` honors `disabled` for out-of-stock products.
- `ProductCard` shows StockBadge (low-stock variant inline next to category eyebrow); disables add button when out.

#### Verified
- 47 routes build (43 static + 3 dynamic API + sitemap/robots).
- `GET /api/v1/products` returns 32 rows from MySQL.
- `GET /api/v1/products?category=keyboards` returns 9.
- `GET /api/v1/products/mxk-65-walnut` returns `Ks 523,000` price.
- Homepage + PDP render MMK prices end-to-end.

### [Unreleased] — Phase 6 (2026-06-16)

#### Added
- Schema: `users`, `accounts`, `sessions`, `verification_tokens`, `addresses`, `carts`, `cart_items`, `orders`, `order_items`. All PKs `varchar(36)` UUIDs to satisfy Drizzle adapter typing.
- Auth.js v5 beta + `@auth/drizzle-adapter` + `bcryptjs` (12 rounds) + `nodemailer` + Google OAuth (conditional on env).
- `src/lib/auth.ts` — NextAuth config (credentials + Google), JWT 30d, role passed through to session.
- `/api/auth/[...nextauth]` route handler.
- `src/lib/mail.ts` — Hostinger SMTP transport via nodemailer; falls back to console log if SMTP env unset.
- `src/lib/rate-limit.ts` — in-memory bucket limiter w/ Retry-After.
- `src/lib/cart-session.ts` — cookie-keyed guest carts in MySQL, user carts on sign-in, merge-on-login logic (sum qty per productId, cap at QTY_MAX).
- Cart APIs: `GET /api/v1/cart`, `POST /api/v1/cart/items`, `PATCH/DELETE /api/v1/cart/items/[productId]`, `POST /api/v1/cart/merge`.
- Signup API: bcrypt(12), sha256-hashed verification token, 30-min TTL, email via nodemailer, rate-limit 5/hr/IP, generic response to prevent account enumeration.
- Verify API: token validation + sets `email_verified`.
- Pages: `/signin` (credentials + Google), `/signup`, `/verify` (handles `?token=&email=`).
- Address APIs: GET/POST list, PATCH/DELETE [id], zod schemas, IDOR-checked against `userId`.
- Orders API: POST creates `pending_payment` order in MySQL transaction (decrement stock with `stockQty >= qty` guard, rollback on OOS), snapshots price+name, sends confirmation email + admin low-stock alerts. GET list own + GET one IDOR-checked.
- Pages: `/checkout` (server-fetches addresses + cart, client `CheckoutForm` w/ radio addresses + notes), `/order/[id]` (confirmation + bank instructions w/ orderId substituted), `/account` (layout + dashboard + sub-nav), `/account/orders`, `/account/orders/[id]`, `/account/addresses` (AddressManager form), `/account/wishlist` (Phase 7 stub).
- `src/components/auth-provider.tsx` wraps app with `SessionProvider`.
- `src/components/account/sign-out-button.tsx`.
- Nav adds account icon → `/account`.
- `.env.local` env additions: `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST`, optional `AUTH_GOOGLE_ID/SECRET`, optional `SMTP_*`, `EMAIL_FROM`, `BANK_PAYMENT_INSTRUCTIONS`.

#### Changed
- `src/lib/cart-store.ts` rewritten as thin API-backed store; localStorage persistence removed (server is source of truth). `CartHydrator` mounts on layout, fetches on app load.
- `CartDrawer` + `/cart` page use the new `CartLine` shape (no per-render product lookups).
- `seed.ts` no longer double-converts USD→MMK (JSON is already MMK since Phase 5).
- `Product` type unchanged; cart store now ships rich `CartLine` snapshots from server.

#### Fixed
- Drizzle adapter type compatibility: switched user/account/session/address/cart/order PK and FK fields from `char(36)` to `varchar(36)`; snake_case columns on `accounts` table (`refresh_token`, `access_token`, etc.) to match adapter contract.
- Seed double-conversion bug — Phase 5 had already converted JSON prices to MMK; Phase 6 seed no longer applies FX.

#### Verified
- 60+ routes build (3 static auth pages, 11+ dynamic API routes, all account pages).
- Guest cart cookie persists across requests, cart_items rows created in MySQL.
- Signup → verification token row inserted → manual SQL `email_verified` flip → user becomes sign-in-eligible.
- Subtotal math correct: `2 × Ks 523,000 = Ks 1,046,000`.

### [Unreleased] — Phase 7 (2026-06-16)

#### Added
- Schema: `reviews`, `wishlists`, `newsletter_subscribers`.
- Reviews API `GET/POST /api/v1/products/[slug]/reviews` with zod validation, HTML stripping on body, auto verified-purchase tag (orders → order_items lookup), 5/day/user rate-limit, unique-per-user-product constraint.
- `src/components/reviews/{stars,review-block}.tsx` — average rating + count, `Stars` (read + interactive), `ReviewBlock` + `ReviewForm` + `ReviewCard` mounted on PDP. Awaiting-moderation toast.
- Wishlist APIs: `GET /api/v1/wishlist` (joined product details), `POST/DELETE /api/v1/wishlist/[productId]`, `POST /api/v1/wishlist/merge`.
- `src/lib/wishlist-store.ts` — zustand store, guest uses localStorage, authed uses DB, merge-on-login via `WishlistHydrator` watching `useSession().status`.
- `HeartButton` on PDP next to Add to cart (filled when saved, optimistic toggle).
- `/account/wishlist` lists saved products via `ProductCard` grid.
- Newsletter API `POST /api/v1/newsletter` persists to MySQL, rate-limit 5/hr/IP, re-activates if previously unsubscribed; `GET /api/v1/newsletter/unsubscribe?token=` flips status. Homepage newsletter form now writes to DB.
- `output: 'standalone'` enabled in `next.config.ts` for Hostinger Passenger compatibility.
- `docs/AUTH-SETUP.md` — SMTP (Hostinger Webmail) + Google OAuth + bank instructions step-by-step.
- `docs/DEPLOY.md` — Hostinger Business deploy end-to-end (hPanel Node app, remote MySQL migrate, env vars, SSL, photo sync, Drizzle Studio SSH tunnel, backups, rolling updates, smoke checklist).
- `CLAUDE.md` docs index updated with `AUTH-SETUP.md` + `DEPLOY.md`.

#### Verified
- 70+ routes build (16 dynamic API routes + account flow + reviews + wishlist + newsletter).
- Typecheck + ESLint clean.
- Schema migration `0001_unknown_stryfe.sql` applied (3 new tables).

### [Unreleased] — Phase 8 (2026-06-16)

#### Added
- React Email templates in `emails/`: `verify-email.tsx`, `order-confirmation.tsx`, `low-stock-alert.tsx`. Warm-palette inline styles, PreviewProps for `react-email dev`.
- `@react-email/components`, `@react-email/render`. `tsconfig.json` `@emails/*` path alias.
- `src/lib/mail.ts` now accepts either `text/html` or `react`; renders to HTML + plaintext via `@react-email/render`.
- Custom `/admin` section (admin-only via `users.role`):
  - `src/app/admin/layout.tsx` role-gate + sub-nav; `page.tsx` KPI overview tiles.
  - `/admin/products` inline-editable table (price MMK, stock, lowStockThreshold, isActive, featured, hasPhotos). Saves on blur. Calls `PATCH /api/v1/admin/products/[id]`, invalidates `products` cache tag.
  - `/admin/orders` status dropdown per order.
  - `/admin/reviews` filter + approve/reject (one click each).
  - `/admin/newsletter` subscribers list + CSV export client-side blob.
- Admin APIs: `PATCH /api/v1/admin/products/[id]`, `/admin/orders/[id]`, `/admin/reviews/[id]` with `requireAdmin()` guard + zod.
- `src/lib/admin-guard.ts` server-side role check.
- `/order/[id]` (visible only when status = `pending_payment`) shows bank-transfer instructions card with the order UUID as the reference; green "Payment received" panel when `paid`. Owner flips status from `/admin/orders/[id]`.
- `docs/LIGHTHOUSE.md` — local + prod audit commands, per-route loop, score targets, LHCI snippet.
- `docs/ADMIN.md` — admin promotion via SQL, admin UI feature map, bank-transfer payment flow, smoke checklist.
- `CLAUDE.md` docs index lists both new docs.

#### Verified
- Typecheck + ESLint clean.
- Build green: admin pages + admin API + bank-transfer order confirmation; React Email components compile.

### [Unreleased] — Phase 4-7 plan locked (2026-06-15)

#### Changed
- Docs updated with full e-commerce scope: MySQL backend, Auth.js, photos pipeline, MMK currency, stock tracking, reviews, wishlist, newsletter, manual bank-transfer orders.
- 6 new ADRs in `docs/TECH.md` covering MySQL/Drizzle, Drizzle Studio admin, Hostinger deploy, manual payments, Auth.js v5, filesystem photos.
- `docs/SCHEMA.md` rewritten with full DB schema + API contract.
- `docs/DESIGN.md` extended with stock badges, reviews UI, wishlist heart, MMK currency formatting, photo style guide.
- `docs/PLAN.md` extended with Phase 4 / 5 / 6 / 7 task lists, milestones M4-M8, done criteria, risk table.
- This file documents new env vars, local MySQL setup, photo conversion workflow, and Phase 5+ scripts.

#### Changed
- N/A (initial release).

#### Fixed
- N/A.

#### Removed
- N/A.
