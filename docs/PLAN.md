# PLAN — merxylab store

## Implementation Plan

### Phase 1 — Foundation
**Goal:** Repo scaffolded with Next.js 15, Tailwind v4, tokens, fonts, shadcn primitives wired, and product/category type contract locked.

Tasks (in dependency order):
1. Init Next.js 15 + TS strict + App Router (`pnpm create next-app`)
2. Add Tailwind v4 + tokens (`src/styles/globals.css` with CSS vars from `docs/DESIGN.md`)
3. Configure `next/font` for Fraunces + Inter
4. Install shadcn CLI, init, add: button, sheet, accordion, dialog, input
5. Define `src/lib/types.ts` (Product, Category, CartItem, CartState)
6. Author `src/data/products.json` (30+ items, 4 categories) + `categories.json`
7. Add Lucide React, Sonner (toasts), Framer Motion, Zustand, Fuse.js
8. Implement `src/lib/cart-store.ts` (zustand + persist)
9. Implement `src/lib/search.ts` (Fuse setup)
10. Author `src/lib/utils.ts` (formatPrice, cn helper, slugify guard)

**Deliverables:** Repo runs `pnpm dev`, base layout renders empty homepage with nav + footer, tokens visible in inspector, cart store wired (no UI yet).
**Effort:** TBD

### Phase 2 — Core features
**Goal:** All routes navigable, homepage matches reference structure with peripheral content, cart drawer works end-to-end, search returns fuzzy results.

Tasks:
1. Build `Nav` + `Footer` + root `layout.tsx`
2. Homepage sections (in order):
   - `Hero` (serif headline w/ inline product chip + tile + side thumbs + carousel dots)
   - `Stats` (50K+ keystrokes / 200+ switches / 99% uptime)
   - `ProductGrid` (3×2 featured products + add-to-cart)
   - `Why` (lifestyle tile + accordion: Build quality / Switch feel / Cable & wireless / Warranty)
   - `CTABanner` (dark bg + tile cutout + craft line)
   - `Newsletter` (visual form, toast on submit)
3. `/shop` page — full grid + sort + category filter chips
4. `/shop/[category]` — same grid filtered
5. `/product/[slug]` — gallery (tile), specs table, add-to-cart, related grid
6. `CartDrawer` (sheet) — line items, qty stepper, subtotal, "View cart" CTA
7. `/cart` page — full summary, qty edit, remove, empty state
8. `/search?q=` page — Fuse results + empty/no-result states
9. Wire `Add to cart` everywhere → cart store action + toast

**Deliverables:** Every route in `docs/PRD.md` works. Cart survives refresh. Search returns matches.
**Effort:** TBD

### Phase 3 — Polish / launch (complete)
**Goal:** Motion pass, taste audit, accessibility verified, Lighthouse > 90 mobile.

Tasks:
1. Motion pass — `whileInView` fade-up on section entries, hover lifts on cards, drawer slide-in, prefers-reduced-motion honored
2. Run `/impeccable` audit on homepage + PDP, apply fixes
3. Run `/taste-skill` pass — kill any generic-template residue
4. Accessibility audit — axe-core, keyboard nav, focus trap on drawer/dialog, alt text
5. Lighthouse pass — verify > 90 mobile performance, > 95 a11y, > 95 best practices, > 95 SEO
6. Add Vercel Analytics + Speed Insights opt-in
7. Empty / 404 / error pages
8. Sitemap + robots.txt + Open Graph metadata per route
9. Final copy pass — replace any remaining lorem with editorial voice
10. Deploy to Vercel preview

**Deliverables:** Production-quality placeholder phase shipped to Vercel preview URL.
**Effort:** TBD

---

### Phase 4 — Photos
**Goal:** Real product photos on disk. Gallery renders photos when present, swatch fallback when not. `hasPhotos` flag drives behavior.

Tasks:
1. Add `Product.hasPhotos: boolean` to `src/lib/types.ts` (default false in JSON)
2. Create `public/products/{slug}/` for all 32 SKUs (empty directories)
3. Write `scripts/check-photos.ts` — Node script that scans each folder, sets `hasPhotos: true` if `01.webp` exists, writes updated JSON. Bonus: prints summary table.
4. Update `Tile` component — if `hasPhotos`, render `next/image` of `/products/{slug}/01.webp`; otherwise current swatch.
5. Build new `Gallery` component for PDP — renders slots 01-04, hides slots that 404 via `onError`.
6. Add `check-photos` to `package.json` scripts: `pnpm photos:check`.
7. Document workflow in `docs/SETUP.md`: how to drop new photos, regenerate `hasPhotos`.

**Deliverables:** Drop a `01.webp` into `public/products/mxk-65-walnut/`, run `pnpm photos:check`, see it appear on homepage + PDP. Removing it returns swatch.
**Effort:** TBD (small)

### Phase 5 — Backend foundation (catalog only)
**Goal:** MySQL replaces inline JSON. Catalog reads come from Drizzle. Frontend behavior unchanged.

Tasks:
1. Install MySQL 8 locally; create `merxylab` database (`CREATE DATABASE merxylab CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`).
2. `pnpm add drizzle-orm mysql2 zod && pnpm add -D drizzle-kit @types/node`
3. Author `drizzle.config.ts` pointing at `DATABASE_URL`.
4. Schema files: `src/db/schema/products.ts` (products, categories, product_specs).
5. `pnpm drizzle-kit generate` → first migration.
6. `pnpm drizzle-kit migrate` → run against local MySQL.
7. Seed script `scripts/seed.ts` — reads `src/data/products.json` + `categories.json`, converts USD cents → MMK (placeholder FX 1 USD = 2100 MMK), inserts rows.
8. `src/db/index.ts` — Drizzle client singleton.
9. Rewrite `src/lib/products.ts` query helpers to use Drizzle (keep same exported function names).
10. Wrap reads in `unstable_cache` with tag-based invalidation.
11. Build `GET /api/v1/products`, `/api/v1/products/[slug]`, `/api/v1/categories`, `/api/v1/categories/[id]/products`.
12. Verify homepage + shop + PDP still render off MySQL.
13. Add `formatMmk` helper to `src/lib/money.ts`; replace all `formatPrice` calls.
14. Add `StockBadge` component; show on `ProductCard` + PDP.

**Deliverables:** Site runs end-to-end against MySQL. Owner can edit a price in Drizzle Studio and see it reflected after revalidate.
**Effort:** TBD

### Phase 6 — Cart + Auth + Orders
**Goal:** Guest carts sync server-side. Users can sign up, sign in, place pending-payment orders.

Tasks:
1. Install Auth.js v5 + Drizzle adapter + bcryptjs + nodemailer + react-email.
2. Schema: `src/db/schema/auth.ts` (users, accounts, sessions, verification_tokens), `addresses.ts`, `carts.ts`, `orders.ts`.
3. Generate + run migrations.
4. `src/lib/auth.ts` — NextAuth config: credentials + Google + email verification + Drizzle adapter.
5. `src/lib/mail.ts` — nodemailer over Hostinger SMTP.
6. Email templates in `emails/`: `verify-email.tsx`, `password-reset.tsx`, `order-confirmation.tsx`, `low-stock.tsx`.
7. Auth routes: `/api/auth/[...nextauth]/route.ts`.
8. Auth pages: `/signin`, `/signup`, `/verify`, `/forgot-password`, `/reset-password`.
9. Cart-session module `src/lib/cart-session.ts` — read/write guest cart cookie.
10. Cart API routes: `/api/v1/cart` + items + merge.
11. Refactor `cart-store.ts` to call API; keep optimistic UI; remove localStorage persistence (server is source of truth).
12. Address API routes + `AddressForm` + `/account/addresses` page.
13. `/checkout` route — choose address, review, confirm. POST `/api/v1/orders` creates order in transaction (decrement stock, snapshot, insert order_items), sends confirmation email, returns redirect to `/order/[id]`.
14. `/order/[id]` page — order summary + bank transfer instructions + status pill.
15. `/account` + `/account/orders` + `/account/orders/[id]` pages.
16. Rate-limit module `src/lib/rate-limit.ts` (Upstash if env set, else in-memory).
17. Wire low-stock email on order placement.

**Deliverables:** End-to-end: guest browses → adds to cart → signs up → email verifies → places order → receives confirmation email with bank instructions. Order visible in `/account/orders`.
**Effort:** TBD

### Phase 7 — Reviews + Wishlist + Newsletter + Hardening
**Goal:** Round out features. Production-ready.

Tasks:
1. Reviews schema (`src/db/schema/reviews.ts`) + migration.
2. Reviews API + components (`Stars`, `ReviewCard`, `ReviewForm`).
3. Reviews block on PDP (approved only) + submit form for authed users.
4. Auto-set `verified_purchase = true` if user has matching order_item.
5. Wishlist schema (`src/db/schema/wishlists.ts`) + migration.
6. `HeartButton` component — guest stores to localStorage, authed POSTs to API.
7. `/account/wishlist` page.
8. Login hook calls `POST /api/v1/wishlist/merge` + `POST /api/v1/cart/merge`.
9. Newsletter schema + form persists to DB (replace toast-only).
10. Unsubscribe page via tokenized link in email footer.
11. Rate limits applied to all public POSTs.
12. axe-core / Lighthouse a11y pass.
13. Lighthouse perf > 90 mobile.
14. Add `output: 'standalone'` to `next.config.ts`, write Hostinger deploy doc.
15. Build first deploy doc in `docs/DEPLOY.md` (Passenger setup, env vars in hPanel, MySQL remote access whitelist).

**Deliverables:** Feature-complete site running on Hostinger Business. Owner manages catalog + reviews + orders through Drizzle Studio.
**Effort:** TBD

## Milestones
| Milestone | Description | Target Date | Status |
|-----------|-------------|-------------|--------|
| M1 | Phase 1 complete — scaffold + tokens + data | 2026-06-15 | Done |
| M2 | Phase 2 complete — all routes functional | 2026-06-15 | Done |
| M3 | Phase 3 complete — site polished + live locally | 2026-06-15 | Done |
| M4 | Phase 4 complete — photos folder + hasPhotos pipeline | TBD | Not started |
| M5 | Phase 5 complete — MySQL replaces inline JSON, catalog APIs live | TBD | Not started |
| M6 | Phase 6 complete — auth + cart sync + orders end-to-end | TBD | Not started |
| M7 | Phase 7 complete — reviews + wishlist + newsletter + hardening | TBD | Not started |
| M8 | Hostinger deploy with custom domain + SMTP wired | TBD | Not started |

## Dependencies map
- Phase 1 task 5 (types) blocks everything in Phase 2.
- Phase 1 task 6 (data) blocks all homepage/shop/PDP/search work.
- Phase 1 task 8 (cart store) blocks CartDrawer, /cart, add-to-cart wiring.
- Phase 2 task 1 (Nav/Footer/layout) blocks all page rendering.
- Phase 3 motion/audit depend on Phase 2 complete.

## Risks + mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Placeholder tiles look lazy, not intentional | Med | High | Use cohesive warm palette + caption labels — explicitly call out as design choice, not stand-in |
| Generic-template visual drift during build | Med | High | Reference `docs/DESIGN.md` token + voice constantly; run /taste-skill pass before declaring done |
| Backend API contract changes break inline JSON consumers | Low | Med | Central `types.ts` is the contract; future API must match shape |
| Cart localStorage corruption | Low | Low | Validate shape with zod on read; clear store + warn user on parse fail |
| Lighthouse perf < 90 from font/JS bloat | Med | Med | Use `next/font` + tree-shake icons, lazy-load Fuse on /search route only |
| Hostinger Node memory limit kills app | Med | High | `output: 'standalone'`, lean route handlers, monitor; fallback to Vercel for app, Hostinger only for SMTP/MySQL |
| MMK FX rate freezes catalog prices stale | Med | Med | Document re-seed process; keep `price_mmk` editable in Studio; owner reviews monthly |
| Auth.js v5 beta breaking changes | Med | Med | Pin version, write E2E tests for all auth flows before deploy |
| Stock oversell under race | Low | High | Order placement runs in MySQL transaction; decrement-with-check rolls back below 0 |
| SMTP rate limits on Hostinger | Med | Low | Transactional only via SMTP; newsletter blasts manual via Webmail CSV import |
| Drizzle Studio accidentally deployed | Low | Critical | Studio command only in `package.json` dev scripts; not in production build |
| Guest-cart merge produces duplicates | Med | Low | Server-side merge sums qty per productId, caps at QTY_MAX |
| Photo path traversal via slug | Low | High | Slug validated against `^[a-z0-9-]+$` at every boundary |
| Bank-transfer fraud (fake "I paid") | Med | Med | Owner verifies transfer before marking order paid; status only changes via Studio |
| MySQL backup gap | Med | High | Hostinger auto-backup daily; add weekly off-host dump cron |

## Done criteria

**Phase 1 done** when:
- [ ] `pnpm dev` runs without errors
- [ ] Empty homepage renders with nav + footer
- [ ] Tokens visible in inspector match DESIGN.md
- [ ] `Product`, `Category`, `CartItem` types compile
- [ ] 30+ products + 4 categories in JSON
- [ ] Cart store + Fuse module compile (no UI yet)

**Phase 2 done** when:
- [ ] Every route in PRD App Flow renders and is navigable
- [ ] Add-to-cart works from card + PDP, drawer opens, toast fires
- [ ] Cart survives page refresh (localStorage)
- [ ] Search returns relevant fuzzy matches; empty/no-result states render
- [ ] Mobile + desktop layouts hold at all 5 breakpoints

**Phase 3 done** when:
- [x] Site renders end-to-end locally
- [x] Motion honors prefers-reduced-motion (MotionConfig)
- [x] Sitemap + robots + OG metadata
- [ ] Lighthouse mobile perf > 90 (verified at deploy)
- [ ] WCAG 2.1 AA verified via axe-core (verified at deploy)

**Phase 4 done** when:
- [ ] `public/products/{slug}/` exists for all 32 SKUs
- [ ] `scripts/check-photos.ts` works (drop file, run, flag flips)
- [ ] Gallery hides missing slots gracefully
- [ ] PDP + ProductCard render real photo when `hasPhotos`

**Phase 5 done** when:
- [ ] MySQL `merxylab` database has all tables + 32 seeded products
- [ ] Site reads catalog from DB (homepage, shop, PDP, search source)
- [ ] Drizzle Studio opens and shows all rows
- [ ] Price changes in Studio reflect in UI after revalidation
- [ ] All prices show as `Ks NNN,NNN` (MMK)
- [ ] Stock badge appears on out-of-stock and low-stock items

**Phase 6 done** when:
- [ ] Signup → email verify → sign in works (credentials)
- [ ] Google OAuth works
- [ ] Guest cart persists across reload; merges into user cart on sign-in
- [ ] User can add/edit/delete addresses
- [ ] Checkout creates order, sends confirmation email, redirects to `/order/[id]`
- [ ] Order page shows bank transfer instructions with order ID as ref
- [ ] `/account/orders` lists user's orders
- [ ] Stock decrements on order placement; out-of-stock blocks add-to-cart

**Phase 7 done** when:
- [ ] Approved reviews render on PDP with average + distribution
- [ ] Authed user can submit review (becomes `pending`)
- [ ] Wishlist heart works guest + authed; merges on login
- [ ] Newsletter form persists; unsubscribe link works
- [ ] All public POST endpoints rate-limited
- [ ] Lighthouse mobile perf > 90
- [ ] axe-core finds zero serious / critical violations
- [ ] Deployed to Hostinger with custom domain + SMTP wired

---

## Current Tasks

### In Progress — Phase 9: multi-method checkout
- [ ] Phase 9.1 — DB: new `payment_methods`, `divisions` tables; expand `orders.status` enum (`payment_submitted`, `confirmed`, `shipped`, `delivered`); add `orders.payment_method_id`, `payment_proof_url`, `payment_tx_ref`, `subtotal_mmk`, `delivery_fee_mmk`, `expires_at`. Migrate `addresses` to Myanmar shape (`division`, `township`, `street`, `landmark`).
- [ ] Phase 9.2 — Seed `divisions` (15 entries: Mandalay 3,000 / Yangon 5,000 / Naypyidaw 5,000 / Bago 5,750 / Magway 5,750 / Ayeyarwady 6,250 / Chin 6,250 / Mon 6,250 / Shan 6,500 / Rakhine 7,000 / Kachin 8,500 / Tanintharyi 8,500 / Kayah blocked / Kayin blocked / Sagaing blocked). COD allowed only for Yangon, Mandalay.
- [ ] Phase 9.3 — Seed empty `payment_methods` rows for `kbz_pay`, `aya_pay`, `uab_pay`, `cod` (inactive). Owner activates from admin.
- [ ] Phase 9.4 — `GET /api/v1/divisions`, `GET /api/v1/payment-methods` public endpoints.
- [ ] Phase 9.5 — `/checkout` rebuild: three-step state machine (delivery / payment method / review). Address form with `+95` phone mask + Myanmar fields. Division dropdown drives delivery fee. Payment method radios (COD conditional). Place-order CTA.
- [ ] Phase 9.6 — `POST /api/v1/orders` updated: snapshot delivery_fee from `divisions`, set `expires_at = now() + 24h`, reject if division blocked, reject COD if cap/city rules fail. Stock decrement in transaction.
- [ ] Phase 9.7 — `/order/[id]` rebuild: wallet path renders `WalletInstructionsCard` + `SlipUploadForm`; COD path renders `CodConfirmationCard`; status-based panels for `payment_submitted` / `confirmed` / `paid` / `shipped` / `delivered` / `cancelled`. Telegram backup link visible on wallet path.
- [ ] Phase 9.8 — `POST /api/v1/orders/[id]/slip` multipart upload. `sharp` resize + EXIF strip + magic-byte sniff. Save to `public/slips/<orderId>/<uuid>.webp`. Flip status to `payment_submitted`. Rate-limit 10/hr/user.
- [ ] Phase 9.9 — `POST /api/v1/orders/[id]/cancel` (customer self-cancel) — allowed only when status = `pending_payment`. Restore stock in transaction. Rate-limit 5/hr/user.
- [ ] Phase 9.10 — Admin: extended `PATCH /api/v1/admin/orders/[id]` with status-machine validation. New `/admin/payment-methods` (CRUD + QR upload). New `/admin/divisions` (edit fee + COD/block flags).
- [ ] Phase 9.11 — React Email: `order-placed`, `slip-received`, `paid`, `shipped` customer templates. `new-order-alert`, `slip-submitted-alert` owner templates.
- [ ] Phase 9.12 — Telegram bot push (owner alerts only). `src/lib/telegram.ts` posts to chat via bot token on new order + slip submitted. Backup contact link `t.me/$TELEGRAM_BACKUP_USERNAME` exposed in env.
- [ ] Phase 9.13 — Auto-cancel cron: `scripts/cancel-expired-orders.ts` runs nightly. Conditional UPDATE for safety. Emails customer.
- [ ] Phase 9.14 — `docs/PAYMENT.md` end-to-end runbook (checkout → slip → verify → ship → deliver). Update `docs/ADMIN.md` to point at new workflow.

### Phase 10 — Inline product CRUD + photo pipeline (shipped to testing 2026-06-17)
- [x] Phase 10.1 — `src/lib/slugify.ts` (lowercase + diacritic strip + non-alnum to `-` + slice to 80; exports `SLUG_REGEX`).
- [x] Phase 10.2 — `POST /api/v1/admin/products` — zod-validated body (slug regex, slug uniqueness via SELECT), inserts `products` + `product_specs` rows in a transaction. Revalidates `products` tag. id = slug.
- [x] Phase 10.3 — Extended `PATCH /api/v1/admin/products/[id]` to accept full product shape + specs array (REPLACE semantics for specs: delete all existing, insert provided).
- [x] Phase 10.4 — `POST /api/v1/admin/products/[id]/photos/[slot]` — slot ∈ {`01`,`02`,`03`,`04`}. Multipart, JPG/PNG/WEBP ≤ 10 MB. `sharp` produces 1600×1600 hero `0X.webp` + 600×600 thumb `0X-thumb.webp` per upload, EXIF stripped. Replaces existing pair atomically. `has_photos` re-synced from filesystem (looks for `01.webp`) after every mutation. Rate-limit 30/hr/admin.
- [x] Phase 10.5 — `DELETE /api/v1/admin/products/[id]/photos/[slot]` — removes both files, re-syncs `has_photos`.
- [x] Phase 10.6 — Rewrote `src/app/admin/products/product-table.tsx`. `+ New product` button at top opens `ProductDetailsForm` inline. Each row gets two expand buttons: Edit details + Edit photos. Save / Discard pair per expanded section, no auto-save.
- [x] Phase 10.7 — `ProductDetailsForm` — name drives auto-slug while user hasn't customised it; category select; price MMK; tagline; description; swatch `<input type="color">` + hex input; stock_qty; low_stock_threshold; featured + is_active toggles; specs editor (dynamic `{label, value}` rows with `+` to add, trash to remove). Slug is read-only in edit mode to keep order references stable.
- [x] Phase 10.8 — `ProductPhotoGrid` — 4-slot grid (01..04). Each cell: 600px thumb preview over swatch-tinted background (cache-busted via `?v=`). Per-slot Replace (file picker) + Remove (trash). Client-side reject for non-JPG/PNG/WEBP + > 10 MB before sending.
- [x] Phase 10.9 — `<Tile>` got a `useThumb` prop (defaults true for grid contexts). Hero + PDP swatch-only fallback opt in to `useThumb={false}`. PDP gallery thumb strip switched to `0X-thumb.webp`.
- [x] Phase 10.10 — Docs synced: PRD owner stories, TECH ADR, SCHEMA endpoint table, DESIGN component sketches, ADMIN runbook, PLAN this section, SETUP changelog. `docs/PAYMENT.md` already covered QR-optional + KBZ Bank. `docs/db-bootstrap.sql` updated to include `kbz_bank`.

### Phase 10.x patches — Refactor + security (shipped to testing 2026-06-17)
- [x] `refactor-clean` pass — deleted unused `scripts/dump-sql.ts`; unexported `EMAIL_REGEX` + `PHONE_REGEX` in `src/lib/validators.ts` (used only internally). Commit `cb87598`.
- [x] Security audit + patches — npm audit 9 → 0. Bumped `next-auth` beta.25 → beta.31, `eslint` 9.17 → 9.39.4. Added `package.json` overrides for `esbuild ^0.28.1` and `next > postcss ^8.5.10`. Tightened production CSP to drop `'unsafe-eval'` from `script-src`. Commit `51244ff`.

### Backlog
- [ ] Hostinger deploy (follow `docs/DEPLOY.md` once domain + DB credentials ready)
- [ ] Configure SMTP + Google OAuth env (`docs/AUTH-SETUP.md`)
- [ ] Real product photography
- [ ] Lighthouse mobile perf pass post-deploy
- [ ] axe-core a11y audit post-deploy
- [ ] Multi-currency / i18n
- [ ] Add second courier (Royal Express?) — new `couriers` table, `divisions.delivery_fee_mmk` becomes per-courier
- [ ] Promo codes / first-order discount
- [ ] Drag-to-reorder photos within `ProductPhotoGrid` (currently fixed 01..04 slots)

### Done
- [x] Grilled product/design preferences via /grill-me
- [x] Documentation scaffold via /necessary-docs
- [x] Project documentation scaffold (PRD, TECH, SCHEMA, DESIGN, PLAN, SETUP, CLAUDE.md)
- [x] Phase 1.1 — Init Next.js 15 + TS strict + App Router
- [x] Phase 1.2 — Tailwind v4 + tokens (CSS-first @theme)
- [x] Phase 1.3 — next/font (Fraunces + Inter)
- [x] Phase 1.4 — Shadcn primitives skipped (Tailwind-only build, more control)
- [x] Phase 1.5 — src/lib/types.ts (Product, Category, CartItem, CartState)
- [x] Phase 1.6 — 32 products + 4 categories in JSON
- [x] Phase 1.7 — Runtime deps (zustand, fuse.js, framer-motion, lucide, sonner, zod, clsx, tailwind-merge)
- [x] Phase 1.8 — cart-store.ts (zustand + persist + localStorage)
- [x] Phase 1.9 — search.ts (Fuse.js fuzzy index)
- [x] Phase 1.10 — utils.ts (cn, formatPrice, slugify, clampQty)
- [x] Phase 2.1 — Nav + Footer + layout + skip link + Toaster
- [x] Phase 2.2 — Homepage (Hero, Stats, ProductGrid, Why, CTABanner, Newsletter)
- [x] Phase 2.3 — /shop with sort + category filter chips
- [x] Phase 2.4 — /shop/[category] static-generated for all 4
- [x] Phase 2.5 — /product/[slug] with specs, gallery, related grid
- [x] Phase 2.6 — CartDrawer (slide-in, Esc close, qty stepper)
- [x] Phase 2.7 — /cart full page + empty state
- [x] Phase 2.8 — /search with fuzzy results + empty/no-result states
- [x] Phase 2.9 — Add-to-cart wired everywhere with toast feedback
- [x] 404 page (/not-found)
- [x] 43 static pages prerendered, all checks green
- [x] Phase 3.1 — Motion polish (MotionConfig + reducedMotion="user")
- [x] Phase 3.7 — sitemap.xml + robots.txt
- [x] Phase 3.8 — Open Graph + Twitter card metadata + title template + themeColor
- [x] Phase 3.x — Live dev verification (homepage, shop, PDP, sitemap render correctly)
- [x] Hero polish (refined inline product chip + tightened tracking)
- [x] Footer logo polish (proper invert filter + ring on flask)
- [x] Phase 4.1 — `hasPhotos: boolean` added to Product type + 32 JSON entries
- [x] Phase 4.2 — Created `public/products/{slug}/` for all 32 SKUs + `.gitkeep` files
- [x] Phase 4.3 — `scripts/check-photos.ts` + `pnpm photos:check` (verified flips both ways)
- [x] Phase 4.4 — Tile renders `next/image` of `01.webp` when `hasPhotos`; new Gallery component renders slots 01-04, hides missing slots via `onError`, animated slot switch, accessible thumb buttons (aria-pressed)
- [x] Phase 4.5 — Photo workflow documented in SETUP.md (cwebp + photos:check pipeline)
- [x] Phase 5.1 — MySQL 9.6 local database `merxylab-store` created (utf8mb4)
- [x] Phase 5.2 — Drizzle + mysql2 + drizzle-kit installed; `drizzle.config.ts` loads `.env.local`
- [x] Phase 5.3 — `src/db/schema/products.ts` (products, categories, product_specs) with FKs + indexes
- [x] Phase 5.4 — First migration generated (`0000_grey_hellcat.sql`) and applied
- [x] Phase 5.5 — Seed script converts USD cents → MMK whole units (FX 2100) and rounds to nearest 1,000 MMK
- [x] Phase 5.6 — Catalog data converted to MMK; `currency` field removed from JSON + Product type
- [x] Phase 5.7 — `src/lib/money.ts` with `formatMmk` (`Ks 249,000`); replaces all `formatPrice` callers
- [x] Phase 5.8 — `src/lib/catalog.ts` async DB-backed helpers wrapped in `unstable_cache` (60s revalidate, tags: products, categories)
- [x] Phase 5.9 — `src/db/index.ts` mysql2 pool singleton (10 connections, dev global cache)
- [x] Phase 5.10 — Server pages (home, shop, shop/[category], product/[slug]) refactored async → DB reads
- [x] Phase 5.11 — Hero, Why, CTABanner, ProductGrid refactored to accept props from server page (no more module-scope JSON loads)
- [x] Phase 5.12 — `StockBadge` component (in stock / low / out) on PDP + ProductCard
- [x] Phase 5.13 — `AddToCartButton` honors `disabled` for out-of-stock
- [x] Phase 5.14 — API routes: `GET /api/v1/products`, `?category=`, `/[slug]`, `/api/v1/categories` with zod validation + structured error envelope
- [x] Phase 5.15 — `pnpm db:generate / db:migrate / db:push / db:studio / db:seed` scripts
- [x] Phase 5.16 — Verified live: API serves DB rows, MMK prices render across home/PDP/shop, 47 routes (43 static + 3 dynamic API + sitemap)
- [x] Phase 6.1 — Schema: users, accounts, sessions, verification_tokens, addresses, carts, cart_items, orders, order_items (varchar PKs to satisfy Drizzle adapter typing)
- [x] Phase 6.2 — Auth.js v5 + @auth/drizzle-adapter + bcryptjs + nodemailer installed
- [x] Phase 6.3 — `src/lib/auth.ts` (credentials + Google OAuth conditional + JWT 30d session + role on session)
- [x] Phase 6.4 — `/api/auth/[...nextauth]` handler
- [x] Phase 6.5 — `src/lib/mail.ts` (Hostinger SMTP via nodemailer, dev fallback logs to console when SMTP unset)
- [x] Phase 6.6 — `src/lib/rate-limit.ts` (in-memory bucket; Upstash later)
- [x] Phase 6.7 — `src/lib/cart-session.ts` — cookie-keyed guest cart, user cart on sign-in, merge on login
- [x] Phase 6.8 — Cart API: GET/POST `/api/v1/cart`, items POST/PATCH/DELETE, `/cart/merge`
- [x] Phase 6.9 — Signup API w/ bcrypt(12) + verification token (sha256 at rest) + email; rate-limit 5/hr/IP; generic response to avoid account enumeration
- [x] Phase 6.10 — Verify API consumes token + sets email_verified
- [x] Phase 6.11 — `/signin`, `/signup`, `/verify` pages
- [x] Phase 6.12 — `SessionProvider` (AuthProvider) wraps app
- [x] Phase 6.13 — `cart-store.ts` rewritten — API-backed, hydrator effect, optimistic open on add
- [x] Phase 6.14 — CartDrawer + `/cart` page use new `CartLine` shape
- [x] Phase 6.15 — Addresses API: GET/POST list + PATCH/DELETE [id], zod schema, IDOR-checked
- [x] Phase 6.16 — `/account` layout w/ sub-nav, `/account/orders`, `/account/orders/[id]`, `/account/addresses` w/ AddressManager form, `/account/wishlist` stub
- [x] Phase 6.17 — Orders API: POST creates pending_payment in MySQL transaction (decrement stock w/ check, rollback on OOS, snapshot price+name), GET list own + GET one IDOR-checked
- [x] Phase 6.18 — Confirmation email sent via `sendMail` (text-only); low-stock admin alert per breached threshold
- [x] Phase 6.19 — `/checkout` page (server-fetches addresses + cart) + `CheckoutForm` client (radio addresses + notes + place order → redirect `/order/[id]`)
- [x] Phase 6.20 — `/order/[id]` confirmation page w/ bank instructions (`BANK_PAYMENT_INSTRUCTIONS` env, `{orderId}` token replaced)
- [x] Phase 6.21 — Nav adds account icon, account layout adds sign-out button
- [x] Phase 6.22 — Bug fix: removed double USD→MMK conversion in seed.ts (JSON already MMK after Phase 5)
- [x] Phase 6.23 — Verified live (port 3002): guest cart cookie/DB persistence works, prices correct, signup+verify flow works (manual DB verify), 60+ routes build
- [x] Phase 7.1 — Schema: `reviews` (rating tinyint, status enum, verified_purchase, unique(user_id+product_id)), `wishlists` (composite PK), `newsletter_subscribers` (unsubscribe token)
- [x] Phase 7.2 — Reviews API: GET (approved only, joins users for name) + POST (zod, HTML-strip body, auto-verified-purchase via order_items lookup, 5/day/user rate-limit, unique constraint = duplicate review prevention)
- [x] Phase 7.3 — Stars + ReviewBlock + ReviewForm + ReviewCard components on PDP (average + count, write-review for authed, awaiting-moderation toast)
- [x] Phase 7.4 — Wishlist API: GET (joins products) + POST/[id] + DELETE/[id] + POST /merge
- [x] Phase 7.5 — `wishlist-store.ts` — guest uses localStorage, authed uses DB, merge-on-login via WishlistHydrator effect watching session.status
- [x] Phase 7.6 — `HeartButton` (filled = saved, optimistic) on PDP next to Add to cart
- [x] Phase 7.7 — `/account/wishlist` page renders saved products in grid via ProductCard
- [x] Phase 7.8 — Newsletter API: POST persists to `newsletter_subscribers` (zod, rate-limit 5/hr/IP, re-activate on resubscribe, generic response on duplicate); GET `/unsubscribe?token=` flips status
- [x] Phase 7.9 — Newsletter homepage form wired to API
- [x] Phase 7.10 — `output: 'standalone'` in `next.config.ts` for Hostinger Passenger compatibility
- [x] Phase 7.11 — Docs: `docs/AUTH-SETUP.md` (SMTP + Google OAuth + bank instructions step-by-step), `docs/DEPLOY.md` (Hostinger end-to-end with hPanel + rsync + SSH-tunnel Studio + backups + rolling updates)
- [x] Phase 7.12 — 70+ routes build (16 dynamic API routes, full account flow, reviews, wishlist, newsletter)
- [x] Phase 8.1 — React Email templates: `emails/{verify-email,order-confirmation,low-stock-alert}.tsx` with PreviewProps
- [x] Phase 8.2 — `src/lib/mail.ts` renders React Email → html + plaintext via `@react-email/render`; falls back to console log if SMTP unset
- [x] Phase 8.3 — Signup + order placement + low-stock alerts switched to React Email components
- [x] Phase 8.4 — `tsconfig.json` paths: `@emails/*` mapping
- [x] Phase 8.5 — Custom admin UI: `/admin` layout w/ role-gate redirect, KPI overview, sub-nav
- [x] Phase 8.6 — `/admin/products` inline-editable table; saves on blur, revalidates `products` cache tag
- [x] Phase 8.7 — `/admin/orders` status select per order
- [x] Phase 8.8 — `/admin/reviews` pending-by-default filter + approve/reject
- [x] Phase 8.9 — `/admin/newsletter` subscribers list + CSV export client-side blob download
- [x] Phase 8.10 — Admin APIs PATCH for products/orders/reviews w/ `requireAdmin()` guard + zod
- [x] Phase 8.11 — `src/lib/admin-guard.ts` server-side role check
- [x] Phase 8.12 — Docs: `docs/LIGHTHOUSE.md` (audit commands + LHCI snippet), `docs/ADMIN.md` (promote-admin + bank-transfer flow + smoke checklist)
- [x] Phase 8.13 — Build green: admin pages + admin API + bank-transfer order confirmation
- [x] Phase 8.14 — Stripe integration removed (Myanmar retail = bank transfer only); SDK uninstalled, code + env keys + docs scrubbed; `docs/STRIPE-AND-ADMIN.md` → `docs/ADMIN.md`; catalog cut to 15 curated SKUs across 6 cats

**Note:** Keep updated. Claude reads this before starting work.

**Current status pointer:** Phases 1-10 done. Phase 10 (inline product CRUD + dual-resize photo pipeline) shipped to `testing` + `main` at commit `6bb7623` on 2026-06-17. Production is held pending owner verification. Phases 1-9 + 9.x patches already live on production. Active focus → owner smoke-tests product create + edit + photo upload on testing → "push to production" → cherry-pick `6bb7623` onto production → push.

**Known limitation carried into Phase 6:** Client components (cart-drawer, search via Fuse, ProductCard category lookup) still read from `src/data/*.json`. Until Phase 6 wires them to API/store-snapshot, owner edits in Drizzle Studio reflect on server pages (PDP/shop/home) only — cart drawer + search still show JSON values until JSON is regenerated. Acceptable for placeholder phase; resolved in Phase 6.1 (cart snapshots) and Phase 7 (search API + client fetch).
