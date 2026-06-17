# TECH — merxylab store

## Architecture

### Tech stack + rationale

**Frontend**
- **Next.js 15 (App Router)** — file-based routing, RSC default, route handlers double as the backend API, image optimization, edge metadata.
- **TypeScript (strict + noUncheckedIndexedAccess)** — catches catalog/cart type drift; Drizzle schema is the single source of truth.
- **Tailwind CSS v4** — design tokens via CSS vars (CSS-first `@theme`), zero runtime cost.
- **Framer Motion** — restrained scroll fades + hover micro-interactions; `MotionConfig reducedMotion="user"` honors a11y system pref.
- **Zustand** — cart store for client UI state (drawer open/close, optimistic updates). DB cart syncs via cookie session.
- **Fuse.js** — client-side fuzzy search; ~10KB; products list fetched from API once then indexed in memory.
- **Fonts:** Fraunces (display, opsz+SOFT axes) + Inter (body), `next/font/google` for zero CLS.

**Backend (Phase 5+)**
- **Next.js route handlers** under `/api/v1/...` — one repo, one deploy.
- **MySQL 8 / MariaDB** — Hostinger Business default, mature, free.
- **Drizzle ORM + mysql2 driver** — TS-native schema, no codegen, raw-SQL escape hatch. Drizzle Studio remains a power-user fallback alongside the custom `/admin` UI.
- **Auth.js v5 (NextAuth)** + **@auth/drizzle-adapter** — email + password (bcryptjs 12 rounds) + Google OAuth. Sessions via JWT in httpOnly cookies. Role propagated through `jwt`/`session` callbacks.
- **nodemailer + React Email** — `src/lib/mail.ts` accepts either text+html or a React element; `@react-email/render` produces HTML + plaintext fallback per send. Templates in `emails/`.
- **zod** — request schema validation at every route boundary.
- **In-memory bucket rate limit** (`src/lib/rate-limit.ts`) — single-instance safe; will swap to Upstash on scale.
- **Payments** — bank transfer only (Myanmar retail). Owner confirms receipt manually from `/admin/orders/[id]`; no online gateway, no card surface.

**Operator surface**
- **Custom `/admin` UI** — role-gated React pages (overview KPIs, products inline-edit, orders status, reviews moderation, newsletter CSV). All admin mutations call `requireAdmin()` guard server-side, never trust client claims.
- **Drizzle Studio** — local-only fallback for ad-hoc inspection (`npm run db:studio`). Production access only via SSH tunnel.

**Deploy target**
- **Hostinger Business shared** — Node.js via Phusion Passenger, MySQL local, SMTP local. Next.js built with `output: 'standalone'`.

### Folder structure (Phase 4-7 target)
```
merxylab-store/
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   ├── shop/page.tsx + [category]/page.tsx
│   │   ├── product/[slug]/page.tsx
│   │   ├── cart/page.tsx, search/page.tsx, not-found.tsx
│   │   ├── sitemap.ts, robots.ts
│   │   ├── signin/page.tsx, signup/page.tsx, verify/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── order/[id]/page.tsx                 # confirmation + bank instructions
│   │   ├── account/
│   │   │   ├── page.tsx                       # dashboard
│   │   │   ├── orders/page.tsx + [id]/page.tsx
│   │   │   ├── addresses/page.tsx + address-manager.tsx
│   │   │   └── wishlist/page.tsx
│   │   ├── admin/                             # role-gated operator UI (Phase 8)
│   │   │   ├── layout.tsx + page.tsx          # KPI overview
│   │   │   ├── products/page.tsx + product-table.tsx
│   │   │   ├── orders/page.tsx + orders-table.tsx
│   │   │   ├── reviews/page.tsx + reviews-list.tsx
│   │   │   └── newsletter/page.tsx + newsletter-export.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── v1/
│   │           ├── products/route.ts + [slug]/route.ts + [slug]/reviews/route.ts
│   │           ├── categories/route.ts
│   │           ├── cart/route.ts + items/route.ts + items/[productId]/route.ts + merge/route.ts
│   │           ├── wishlist/route.ts + [productId]/route.ts + merge/route.ts
│   │           ├── orders/route.ts + [id]/route.ts
│   │           ├── addresses/route.ts + [id]/route.ts
│   │           ├── newsletter/route.ts + unsubscribe/route.ts
│   │           ├── auth/signup/route.ts + verify/route.ts
│   │           ├── admin/products/[id]/route.ts
│   │           ├── admin/orders/[id]/route.ts
│   │           └── admin/reviews/[id]/route.ts
│   ├── components/
│   │   ├── nav.tsx, footer.tsx, cart-drawer.tsx, cart-hydrator.tsx, motion-provider.tsx, auth-provider.tsx
│   │   ├── home/{hero,stats,product-grid,why,cta-banner,newsletter}.tsx
│   │   ├── product/{card,tile,gallery,add-to-cart-button,stock-badge}.tsx
│   │   ├── shop/grid-controls.tsx
│   │   ├── reviews/{stars,review-block}.tsx
│   │   ├── wishlist/{heart-button,wishlist-hydrator}.tsx
│   │   └── account/sign-out-button.tsx
│   ├── lib/
│   │   ├── cart-store.ts, search.ts, types.ts, utils.ts, products.ts
│   │   ├── auth.ts                            # NextAuth config (credentials + Google conditional)
│   │   ├── auth-handlers.ts                   # re-export GET/POST for /api/auth catch-all
│   │   ├── admin-guard.ts                     # requireAdmin() server-side role check
│   │   ├── catalog.ts                         # DB-backed catalog helpers + unstable_cache
│   │   ├── mail.ts                            # nodemailer + React Email renderer
│   │   ├── cart-session.ts                    # guest cart cookie + merge-on-login
│   │   ├── cart-store.ts                      # zustand client store (API-backed)
│   │   ├── wishlist-store.ts                  # zustand wishlist (guest localStorage + DB on auth)
│   │   ├── rate-limit.ts                      # in-memory bucket limiter
│   │   ├── search.ts, types.ts, utils.ts, money.ts, products.ts (legacy JSON helpers)
│   ├── db/
│   │   ├── index.ts                           # drizzle client (mysql2 pool)
│   │   ├── schema/
│   │   │   ├── auth.ts                        # users, accounts, sessions, verification_tokens
│   │   │   ├── products.ts                    # products, categories, product_specs
│   │   │   ├── carts.ts                       # carts, cart_items
│   │   │   ├── addresses.ts
│   │   │   ├── orders.ts                      # orders, order_items
│   │   │   ├── reviews.ts
│   │   │   ├── wishlists.ts
│   │   │   └── newsletter.ts
│   │   └── migrations/                        # drizzle-kit output
│   ├── data/                                  # legacy JSON, kept for seed only
│   └── styles/
├── emails/                                    # React Email templates (Phase 8)
│   ├── verify-email.tsx
│   ├── order-confirmation.tsx
│   └── low-stock-alert.tsx
├── public/
│   ├── favicon.ico, logo.png
│   └── products/{slug}/{01-04}.webp           # filesystem photo store
├── scripts/
│   ├── check-photos.ts                        # populates hasPhotos
│   └── seed.ts                                # JSON → MySQL
├── drizzle.config.ts
├── docs/, .env.local, .env.example
├── package.json, tsconfig.json, next.config.ts
```

### Request lifecycle / data flow
- **Placeholder phase (done):** all data statically imported JSON. Pages render at build time.
- **Phase 4-7:**
  - Catalog reads: RSC fetches via Drizzle directly in server components → cached with `unstable_cache` (revalidate 60s).
  - Search: client fetches `/api/v1/products` once, builds Fuse index in memory.
  - Cart mutations: client → optimistic update via zustand → POST `/api/v1/cart/items` → server validates → DB write → revalidates.
  - Auth: NextAuth route handlers under `/api/auth/*`, JWT in httpOnly cookie, server components read `auth()` helper.
  - Photos: served as static from `public/products/{slug}/01.webp` via `next/image`. Missing files = swatch fallback.
  - Email: server actions call `nodemailer.sendMail` via Hostinger SMTP (TLS 465).

### Technical goals
- Lighthouse Performance > 90 mobile, > 95 desktop.
- First Contentful Paint < 1.2s on 4G.
- Total JS bundle < 200KB gzipped (initial route).
- Cart drawer opens in < 100ms after click.
- Zero layout shift (CLS = 0) — `next/font` + reserved hero space.

### Non-functional requirements
- Latency: N/A in placeholder phase (static).
- Availability: depends on hosting (Vercel SLA when deployed).
- Security: standard browser-context only; no PII stored.
- Accessibility: WCAG 2.1 AA — keyboard nav, focus rings, semantic HTML, color contrast verified.

### System constraints
- Node 20+ required for build.
- Modern evergreen browsers only (no IE11).
- localStorage required for cart persistence (graceful fallback to session memory).

### Integration points
- Google Fonts (Fraunces, Inter) via `next/font` — auto-self-hosted at build.
- Future: backend API (TBD), payment processor (TBD), email/newsletter provider (TBD).

### Scalability plan
- Placeholder phase: static export possible — CDN edge cache.
- Post-backend: API routes via Next.js handlers OR separate service; ISR/SSG for product pages; Redis cache for cart + sessions.

### Deployment target
- Assumed: **Vercel** (Next.js native, edge functions, image optimization).
- Region: auto-edge.
- Alt: any Node 20 host (self-hosted via `next build && next start`).

### Observability
- Placeholder phase: Vercel Analytics (page views, web vitals) — opt-in.
- Post-API: structured server logs, error tracking (Sentry), uptime monitor.

---

## Architecture Decision Records

### [2026-06-15] Use Next.js 15 App Router over Vite SPA
**Status:** Accepted
**Context:** Need TS frontend now, real API later. Must swap data layer without rewriting routing/SSR.
**Decision:** Next.js 15 App Router + RSC default.
**Consequences:** Higher initial complexity than Vite, but SSR/ISR available when API lands; SEO-ready out of the box; image optimization built-in; file-based routes reduce boilerplate.

### [2026-06-15] Inline JSON catalog, no repository abstraction
**Status:** Accepted
**Context:** Placeholder phase. Backend API designed later. Choice: clean repository interface vs raw JSON imports.
**Decision:** Direct JSON imports from `src/data/`. Refactor to API client when backend lands.
**Consequences:** Faster build now, zero indirection. Trade-off: every page touching products will need a swap when API lands (mitigated by central `types.ts` already defining `Product` shape).

### [2026-06-15] Zustand + localStorage for cart, not Context
**Status:** Accepted
**Context:** Cart state needs persistence + low boilerplate.
**Decision:** Zustand store with `persist` middleware writing to localStorage.
**Consequences:** No provider tree pollution; survives refresh; trivial to migrate to server-side cart later by swapping the persist storage.

### [2026-06-15] Tailwind v4 + shadcn/ui (copy-in), not a UI kit
**Status:** Accepted
**Context:** Must avoid generic-template look. Need primitives without lock-in.
**Decision:** Tailwind v4 for tokens + utilities, shadcn/ui primitives copied into `src/components/ui/` for accordion, sheet (drawer), button, dialog.
**Consequences:** Full restyle control, no opaque library upgrades to fight, larger initial setup vs. Chakra/MUI.

### [2026-06-15] Fuse.js client-side search, not server search
**Status:** Accepted
**Context:** No backend in placeholder phase. 30+ products comfortably fit in-memory.
**Decision:** Fuse.js, indexed in `src/lib/search.ts`, lazy-loaded on `/search` route.
**Consequences:** Instant results, zero infra. Will not scale past ~1000 products without server search (Algolia / Meilisearch when needed).

### [2026-06-15] MySQL via Drizzle, not Postgres
**Status:** Accepted
**Context:** Hostinger Business shared bundles MySQL/MariaDB free. Single-host deploy.
**Decision:** MySQL 8 with Drizzle ORM (mysql2 driver). No Postgres-specific features used.
**Consequences:** Locked out of Postgres extensions (jsonb operators, gin/trgm indexes, RLS). Drizzle masks driver differences; migration to Postgres later possible but not free. Acceptable for catalog/orders/reviews shape.

### [2026-06-15] Drizzle Studio as admin UI, no custom /admin
**Status:** Accepted
**Context:** Owner needs to add products, moderate reviews, fulfill orders. Custom admin is weeks of work.
**Decision:** `npm run db:studio` opens local-only web UI for CRUD. Photos dropped into `public/products/{slug}/`. Never deployed to production.
**Consequences:** Owner must run admin tasks from local checkout connected to prod DB (or via SSH tunnel). No multi-user admin. Trade-off accepted for speed.

### [2026-06-15] Hostinger Business shared (Node via Passenger), not Vercel
**Status:** Accepted
**Context:** Owner already has Hostinger Business; wants single-host (app + MySQL + SMTP + domain).
**Decision:** Deploy Next.js with `output: 'standalone'` to Hostinger Node.js via Phusion Passenger. MySQL + SMTP co-located.
**Consequences:** Memory + cold-start constraints; no edge runtime; no Vercel image-optimization CDN. Mitigated by keeping route handlers lean, generous static pre-render via `generateStaticParams`, manual `next/image` `quality` tuning.

### [2026-06-15] Manual bank-transfer "payments", no Stripe yet
**Status:** Accepted
**Context:** Owner in market without easy card-payment access; wants to ship.
**Decision:** Checkout creates `orders.status = 'pending_payment'` with order ID as bank ref. Confirmation email lists bank details. Owner marks paid in Drizzle Studio.
**Consequences:** Manual reconciliation. No PCI scope. Trivial to add Stripe later — `orders.payment_ref` field already nullable, status enum extends.

### [2026-06-15] Auth.js v5 with email/password + Google OAuth
**Status:** Accepted
**Context:** D-scope auth, full e-commerce, owner wants both options.
**Decision:** NextAuth v5 + @auth/drizzle-adapter. bcryptjs for password hashing (12 rounds). Google as only OAuth provider. Email verification via SMTP magic link.
**Consequences:** v5 still beta — pinned version, all flows E2E tested. Password reset uses time-limited tokens via verification_tokens table.

### [2026-06-17] Photos on Cloudflare R2 (supersedes "Photos on filesystem")
**Status:** Accepted
**Context:** Hostinger Easy Deploy treats `public/` as a build-frozen snapshot. Runtime `writeFile()` succeeds against a working directory the Next runtime does not serve from, so admin-uploaded photos, QRs, and slips silently 404 / 400 even though File Manager shows the file on disk. The filesystem assumption underlying the previous ADR is wrong on this hosting model. Cheaper to move object storage off the host than to switch hosting model (see grilled options: regular Hostinger Node app vs R2 vs commit-to-git; R2 won on durability + zero egress + no extra hosting reshuffle).
**Decision:** All admin-uploaded media moves to Cloudflare R2 via the S3-compatible API. Two buckets:
- `merxylab-public` — `products/<slug>/<slot>.webp` + `products/<slug>/<slot>-thumb.webp` + `payment-qr/<methodId>.webp`. Custom domain binding (`cdn.merxylab.com`), public reads via CF edge.
- `merxylab-private` — `slips/<orderId>/<uuid>.webp`. No public binding. Bytes streamed back through the existing authed `GET /api/v1/orders/[id]/slip` route after `order.userId === session.user.id` OR `role === 'admin'` check. `Cache-Control: private, no-store`.

`products.has_photos` is now set in-route based on the slot 01 mutation that just happened — no more `readdir` against disk. `payment_methods.qr_image_url` and `orders.payment_proof_url` store R2 keys (not URLs); a server-side `r2PublicUrl()` helper in `src/lib/cdn.ts` builds the final URL using `NEXT_PUBLIC_CDN_URL`, with a legacy-path fallback for rows that still hold the old disk path.

`sharp` continues to run in the Next route (1600×1600 hero + 600×600 thumb for products, 1600×1600 for slips, 600×600 for QRs), so EXIF stripping + MIME re-encoding still happens before bytes hit R2. PutObject runs after sharp.
**Consequences:**
- New env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, `NEXT_PUBLIC_CDN_URL`.
- Two API tokens to rotate (one per bucket). Keep scope to the relevant bucket only.
- `next.config.mjs` `images.remotePatterns` now allowlists the CDN host so `<Image>` accepts the external src.
- Bandwidth: R2 egress is free; CF edge serves products + QR globally. Slip reads still go through Next origin (low volume, admin-only).
- Disk paths (`public/products/...`, `public/payment-qr/...`, `private-uploads/slips/...`) become deprecated. Existing rows whose `qr_image_url` / `payment_proof_url` hold the legacy `/path/file.webp` shape still render: `r2PublicUrl()` returns the original path verbatim if it already looks absolute or starts with `/`, so the old static-served files keep working until the owner re-uploads through the new R2 path.
- Cost: ~$0/mo at retail volume (R2 free tier covers 10 GB storage + 1M Class A + 10M Class B ops).

### [2026-06-16] Custom `/admin` UI alongside Drizzle Studio
**Status:** Accepted (supersedes earlier ADR "Drizzle Studio as admin UI, no custom /admin")
**Context:** Drizzle Studio works but ships raw rows, requires SSH tunnel to run against production, has no domain-aware affordances (e.g. moderating a review or status-flipping an order is hostile). Owner wants ops day-to-day to happen in the same brand-aware UI as customers.
**Decision:** Build first-party `/admin` pages role-gated to `users.role = 'admin'`. Promotion is a DB `UPDATE` — no self-service. Drizzle Studio retained as power-user fallback for ad-hoc inspection.
**Consequences:** More UI surface to maintain. Mutations still validated server-side via `requireAdmin()` + zod. No public admin-signup vector (must go through DB). Trade-off accepted because admin tasks happen weekly+ and the operator UX cost compounds.

### [2026-06-16] Bank transfer only, no card payment surface
**Status:** Accepted
**Context:** Myanmar retail buyers transact via local bank apps. International card rails (Stripe, etc.) don't service Myanmar reliably and add PCI scope without matching local demand.
**Decision:** Remove Stripe entirely. `/order/[id]` shows only bank-transfer instructions with the order UUID as the reference. Owner verifies receipt in their bank app and flips the order to `paid` from `/admin/orders/[id]`.
**Consequences:** No FX drift, no PCI scope, no webhook surface. Owner is the single source of truth for payment confirmation — manual but tractable at retail volume. KBZ Pay / 2C2P / similar locally-licensed processors can be added later as new buttons on `/order/[id]`.

### [2026-06-16] React Email for transactional templates
**Status:** Accepted
**Context:** Plaintext emails work but read like spam to filters and look out of brand.
**Decision:** All transactional emails (verify, order confirmation, low-stock) authored as React Email components in `emails/`. `src/lib/mail.ts` renders to HTML + plaintext fallback per send via `@react-email/render`.
**Consequences:** Components live outside `src/` so `react-email dev` previewer can hot-reload them. Type-safe Props per template. Plain-text fallback auto-generated, satisfies email clients that block HTML.

### [2026-06-16] Lighthouse audit playbook over CI gating (for now)
**Status:** Accepted
**Context:** No CI yet. Adding LHCI to a future GitHub Actions setup is straightforward but premature.
**Decision:** Document the audit commands + targets in `docs/LIGHTHOUSE.md`. Owner runs before each release. Include the LHCI config snippet so CI gating drops in when ready.
**Consequences:** Manual discipline required. Acceptable while traffic + release cadence are low.

### [2026-06-16] Multi-method wallet payment + COD + in-app slip upload
**Status:** Accepted
**Context:** Bank-transfer-only with the order UUID as reference (previous ADR) was the simplest possible flow but leaves the customer doing all the coordination: opening a separate bank app, copying the UUID, then sending the slip outside the site (Slack/Telegram/email). Friction lost orders.
**Decision:** Build a multi-method checkout. Customer picks from KBZ Pay / Aya Pay / UAB Pay / COD at `/checkout`. Methods configured by the owner in `/admin/payment-methods` (DB-backed `payment_methods` table). On `/order/[id]` the wallet path shows merchant QR + account name + phone; customer uploads slip image (JPG/PNG/WEBP, 8MB cap, client-resized to 1600px) + optional tx ref. Slip upload flips order to `payment_submitted`. Owner verifies in their bank app and flips to `paid`. COD path uses an extra `confirmed` state set after owner phone-confirms the buyer.
**Consequences:** New tables (`payment_methods`, `divisions`), expanded `orders.status` enum (adds `payment_submitted`, `confirmed`, `shipped`, `delivered`), new fields on `orders` (`payment_method_id`, `payment_proof_url`, `payment_tx_ref`, `subtotal_mmk`, `delivery_fee_mmk`, `expires_at`). New cron `scripts/cancel-expired-orders.ts` auto-cancels stale `pending_payment` orders after 24h. Under the commit-at-payment stock model (see "Stock oversell" below), cancellation is a pure status flip — no inventory restore. Slip storage moved to Cloudflare R2 private bucket (`slips/<orderId>/<uuid>.webp`), served only via authed `GET /api/v1/orders/[id]/slip` route which streams bytes from R2. See ADR "Photos on Cloudflare R2". Telegram is a backup contact link (`t.me/<username>`), not a primary submission path.

### [2026-06-16] BeeExpress per-division flat-fee shipping
**Status:** Accepted
**Context:** Single nationwide fee subsidises remote orders. Real-time courier integration is overkill at retail volume. Owner uses BeeExpress (Mandalay base) which publishes a flat fee per division.
**Decision:** Persist a `divisions` table seeded with all 15 Myanmar divisions plus Naypyidaw Union Territory. Each row carries `delivery_fee_mmk`, `cod_allowed`, `is_blocked`. Kayah, Kayin, Sagaing are blocked (no BeeExpress coverage). COD allowed only for Yangon + Mandalay AND order total ≤ 500,000 MMK — enforced both client-side (radio hidden) and server-side at order creation.
**Consequences:** Owner can adjust fees from `/admin/divisions` without redeploy. Adding a second courier (separate division tier) is a new column, not a new table.

### [2026-06-16] Inline product CRUD + dual-resize photo pipeline (`/admin/products`)
**Status:** Accepted
**Context:** Adding a new SKU previously required editing `src/data/products.json`, regenerating the SQL bootstrap, and re-importing. Owner asked for an in-browser path so launches don't gate on developer time. Photo handling was completely missing from the admin.
**Decision:** Build a Save/Discard inline editor on `/admin/products`. A "+ New product" button opens a top-of-page form (name → auto-slug, category dropdown, price MMK, tagline, description, swatch via native color picker, stock_qty, low_stock_threshold, featured, is_active). Specs editor is a dynamic list of `{label, value}` rows added/removed in place; the whole record (product + specs) is committed in a single transaction via `POST /api/v1/admin/products`. Editing an existing row uses the same form via expand-row; `PATCH /api/v1/admin/products/[id]` accepts the same shape. Photos live in `/admin/products` as an Expand → 4-slot grid (01..04). Each slot has its own `POST` (replace) and `DELETE` (remove) endpoint. Server runs `sharp` twice per upload: one 1600×1600 WEBP hero (`0X.webp`) and one 600×600 WEBP thumb (`0X-thumb.webp`), both EXIF-stripped. PDP gallery reads the hero; `<ProductCard>` and `<Tile>` read the thumb. Soft delete only via `is_active = false` — no hard-delete path because order history references stay referentially intact.
**Consequences:** Two image files per slot per product = up to 8 disk objects per SKU. Acceptable footprint at retail volume on Hostinger persistent disk. No JSON ↔ DB sync step needed anymore (the JSON files remain only as legacy seed sources for the bootstrap SQL). Adding a new color picker requirement in the future means swapping the native control for a curated palette — schema unchanged.

---

## Security

### Auth + authorization
- Placeholder phase: no auth.
- **Phase 6+:** Auth.js v5 with `@auth/drizzle-adapter`.
  - Strategies: credentials (bcryptjs, 12 rounds) + Google OAuth.
  - Session: JWT in `httpOnly`, `secure`, `sameSite=lax` cookie; 30 days rolling.
  - Email verification required before first sign-in; magic link via Hostinger SMTP, 30-min expiry.
  - Password reset: time-limited token via `verification_tokens` table, 15-min expiry, single-use.
  - Roles: `customer` (default), `admin` (set manually in Drizzle Studio). Admin role gates nothing in MVP (Studio replaces admin UI) but reserved for future `/api/v1/admin/*`.
  - All mutating endpoints check `auth()` server-side, never trust client claims.
  - Brute-force defense: `@upstash/ratelimit` 5/min per email on sign-in, 5/hour per IP on signup.

### Input validation
- Newsletter form: validate email format client-side (HTML5 `type=email` + regex), server validates with zod and persists to `newsletter_subscribers`.
- Search query: trim + length cap (200 chars) before passing to Fuse.
- Cart qty: clamp to [1, 99]; reject non-integer; server re-validates against `stockQty`.
- All POST/PATCH/DELETE: zod schema at route boundary, reject on parse fail with structured error.
- Address fields: zod with regex for postal/phone, length caps.
- Review body: 10-2000 chars; strip HTML; rating integer 1-5.
- File uploads: not exposed via API — owner drops files into `public/products/{slug}/` directly.

### Secret management
- `.env.local` is the only place secrets exist locally — gitignored, never committed.
- `.env.example` is committed with empty/dummy values + descriptions for every required key.
- `process.env.X` access only in server components, server actions, and route handlers. Any client-readable env starts with `NEXT_PUBLIC_*` (only `NEXT_PUBLIC_SITE_URL` exists).
- On Hostinger: env vars set via hPanel → Node.js app → environment variables. Never SSH-edit `.env.local` on prod.
- Rotation: AUTH_SECRET, SMTP_PASS, AUTH_GOOGLE_SECRET every 90 days; on any suspected leak immediately.
- The dev MySQL password (`Tkhantiang1`) is local-only. Production MySQL uses a separate generated password set in hPanel; never reuse the dev password in prod.

### Known attack surfaces + mitigations
- **XSS via product copy / reviews:** all user-facing strings render as text via React, never `dangerouslySetInnerHTML`. Review bodies stripped of HTML on write.
- **SQL injection:** Drizzle uses parameterized queries; raw SQL escape hatch only with explicit param binding.
- **localStorage tampering:** cart + wishlist are non-sensitive; server re-validates every cart mutation, qty clamped, stockQty re-checked; wishlist merge validates productIds against `^[a-z0-9-]+$` regex.
- **CSRF:** NextAuth uses double-submit cookie + SameSite=lax. All mutating route handlers require an authed session OR a same-origin guest cart cookie.
- **Open redirect:** all redirect targets validated against allowlist; user input never used in `redirect()` calls.
- **Account enumeration:** sign-in always returns the same generic error on bad password OR unknown email; signup always returns "check your email" regardless of whether email was already registered.
- **Brute force:** rate-limit sign-in 5/min/email, signup 5/hr/IP, password reset 3/hr/email, reviews 5/day/user, newsletter 5/hr/IP, orders 10/hr/user, cart 60/min/session.
- **IDOR (orders / addresses / wishlist):** every read/write checks `row.userId === session.user.id`.
- **Privilege escalation to admin:** `users.role` is only set via DB `UPDATE`. No API or UI path can elevate. `requireAdmin()` re-checks the JWT-derived role on every admin endpoint.
- **Email injection:** all email headers via nodemailer's typed API, never string-concatenated. React Email renders auto-escape interpolated values.
- **Bank-ref forgery:** order ID is server-generated UUID, used as the payment reference; can't be forged client-side.
- **Order status tampering:** only the owner (admin role, server-checked) can flip `status` from `pending_payment` to `paid`/`confirmed`/`shipped`/`delivered`. Customer-side API exposes only slip upload (→ `payment_submitted`) and self-cancel (→ `cancelled`, allowed only while `pending_payment`). Server-enforced state machine rejects illegal transitions.
- **Slip upload abuse:** rate-limit 10/hour/user. File magic-byte sniffed (`image/jpeg`, `image/png`, `image/webp` only — no SVG, no PDF, no HEIC). Server-side resize via `sharp` strips EXIF + caps at 1600×1600. Stored in the private R2 bucket at key `slips/<orderId>/<uuid>.webp` — `orderId` is the server-generated UUID, the basename is also a server-generated UUID, so no user-controlled paths. `orders.payment_proof_url` holds only the basename. Slips served exclusively via `GET /api/v1/orders/[id]/slip`, which auth-checks (`order.userId === session.user.id` OR `role === 'admin'`) on every read, `GetObject`s from R2, and responds `Cache-Control: private, no-store`. Customer can re-upload only while status is `pending_payment` or `payment_submitted`; replacement deletes the prior R2 object via `DeleteObject` after the new `PutObject` succeeds.
- **Auto-cancel race:** auto-cancel cron updates `status = 'cancelled'` only when current `status = 'pending_payment'` (conditional UPDATE). Concurrent slip upload that flipped to `payment_submitted` first wins; cron skips that row. No stock math runs in the cron because pending orders never held physical inventory.
- **Stock oversell:** order placement does a snapshot `stockQty >= qty` *read* check on every line and rejects with `OUT_OF_STOCK` if any line fails — but does **not** decrement stock. The decrement happens at the single payment-confirmation boundary: when admin flips an order to `confirmed` (wallet OR COD), a transaction runs `UPDATE products SET stockQty = stockQty - qty WHERE id = ? AND stockQty >= qty` per line and rolls back if any affected-rows is 0, returning `OUT_OF_STOCK` to the admin. After commit the route calls `revalidateTag('products')` so the 60-second catalog cache picks up the new stock immediately. Cart-add (`POST /api/v1/cart/items`) does its own live DB read for stock — never the cached catalog — so customers see current numbers. Cancelling a `confirmed` order restores stock; cancelling a `pending_payment`/`payment_submitted` order does not (nothing to restore). Trade-off: tiny oversell window between two checkouts on the last unit. At retail volume the owner sees both pending orders in `/admin/orders` and can call one customer to swap; the system never silently double-sells because the admin-side confirm flip will return 409 for the second order.
- **Photo path traversal:** photo paths constructed only from `slug` field (regex `^[a-z0-9-]+$`); never from user input.
- **Admin CSV export leaking PII:** CSV is generated client-side from already-authorized server data (admin-only `/admin/newsletter` page). No public route exposes the dataset.

### Dependency audit process
- Run `npm audit` weekly (project is on npm, not pnpm — see ADR-09).
- Renovate / Dependabot for automated PRs (set up post-MVP).
- Pin major versions in `package.json`.
- Review every new dep — prefer < 50KB, > 1k weekly downloads, recent maintenance.
- Use `package.json` `overrides` to force-patch transitive vulns when upstream lag exists (currently: `esbuild ^0.28.1` for drizzle-kit nested @esbuild-kit; `next > postcss ^8.5.10` for next's bundled postcss). Re-evaluate on next upstream major bump.
- Last audit: 2026-06-17 — **0 vulnerabilities**. History: 9 → 0 after `next-auth` beta.25 → beta.31, `eslint` 9.17 → 9.39.4, and the overrides above.

### Content Security Policy
- CSP header set in `next.config.mjs` for all routes.
- Production drops `'unsafe-eval'` from `script-src`; dev retains it for HMR/React Refresh (gated on `process.env.NODE_ENV === 'production'`).
- `'unsafe-inline'` still permitted on `script-src` + `style-src` pending nonce middleware. Tightening to nonce-based CSP is a deferred follow-up — requires a `middleware.ts` that issues a per-request nonce and threads it through `<Script nonce={...} />` / `<style nonce={...}>` plus Next's internal injections.
