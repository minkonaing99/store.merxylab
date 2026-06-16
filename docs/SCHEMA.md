# SCHEMA — merxylab store

Phase 4-7: MySQL persistence via Drizzle ORM. Tables defined in `src/db/schema/*.ts`. Inline JSON in `src/data/` is retained only as the seed source.

Naming: `snake_case` columns, `lower_snake` table names, PKs are CHAR(36) UUIDs or VARCHAR slug-style natural keys where useful.

Currency: **MMK** stored as **whole-integer BIGINT** (no subunit). Display in UI as `Ks 249,000`.

---

## Data Models

### `categories`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(32) | PK | natural key, e.g. `keyboards` |
| name | VARCHAR(80) | NOT NULL | |
| description | TEXT | NOT NULL | |
| sort_order | INT | NOT NULL DEFAULT 0 | display order |
| created_at | TIMESTAMP | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT now() ON UPDATE now() | |

### `products`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(64) | PK | slug-safe id |
| slug | VARCHAR(80) | UNIQUE NOT NULL | URL slug |
| name | VARCHAR(120) | NOT NULL | |
| category_id | VARCHAR(32) | NOT NULL, FK → categories.id | |
| price_mmk | BIGINT | NOT NULL, ≥ 0 | whole MMK units |
| tagline | VARCHAR(200) | NOT NULL | |
| description | TEXT | NOT NULL | |
| swatch | CHAR(7) | NOT NULL | `^#[0-9A-Fa-f]{6}$` |
| stock_qty | INT | NOT NULL DEFAULT 0 | |
| low_stock_threshold | INT | NOT NULL DEFAULT 3 | "only N left" trigger |
| has_photos | BOOLEAN | NOT NULL DEFAULT false | populated by `scripts/check-photos.ts` |
| is_active | BOOLEAN | NOT NULL DEFAULT true | hide without deleting |
| featured | BOOLEAN | NOT NULL DEFAULT false | homepage hero candidate |
| created_at | TIMESTAMP | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT now() ON UPDATE now() | |

Indexes: `idx_products_category`, `idx_products_featured`, `idx_products_is_active`, fulltext index on `(name, tagline, description)` for optional server search fallback.

### `product_specs`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGINT | PK AUTO_INCREMENT | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE CASCADE | |
| label | VARCHAR(80) | NOT NULL | |
| value | VARCHAR(200) | NOT NULL | |
| sort_order | INT | NOT NULL DEFAULT 0 | |

Index: `idx_specs_product` on `(product_id, sort_order)`.

### Auth tables (Auth.js v5 Drizzle adapter shape)

**`users`**
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | UUID |
| email | VARCHAR(254) | UNIQUE NOT NULL | |
| email_verified | TIMESTAMP | NULL | verified-at, NULL means unverified |
| password_hash | VARCHAR(60) | NULL | bcrypt 12 rounds, NULL for OAuth-only |
| name | VARCHAR(120) | NULL | |
| image | VARCHAR(500) | NULL | OAuth avatar URL |
| role | ENUM('customer','admin') | NOT NULL DEFAULT 'customer' | |
| created_at, updated_at | TIMESTAMP | | |

**`accounts`** (OAuth linkages — Auth.js adapter schema)
- `user_id`, `type`, `provider`, `provider_account_id`, `refresh_token`, `access_token`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state`
- PK: `(provider, provider_account_id)`

**`sessions`** (only used if database session strategy chosen — currently JWT, so empty)
- `session_token` PK, `user_id`, `expires`

**`verification_tokens`** (email verify + password reset)
- `identifier` (email), `token` (hash), `expires`
- PK: `(identifier, token)`

### `addresses`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | |
| user_id | CHAR(36) | NOT NULL, FK → users.id ON DELETE CASCADE | |
| label | VARCHAR(40) | NOT NULL | "Home", "Office" |
| recipient | VARCHAR(120) | NOT NULL | |
| phone | VARCHAR(20) | NOT NULL | Myanmar `+95 9XX XXX XXX`, regex enforced |
| division | VARCHAR(40) | NOT NULL, FK → divisions.id | Region/State/Naypyidaw |
| city | VARCHAR(120) | NOT NULL | e.g. Yangon, Mandalay |
| township | VARCHAR(120) | NOT NULL | e.g. Hlaing, Chanmyathazi |
| street | VARCHAR(200) | NOT NULL | street + house no |
| landmark | VARCHAR(200) | NULL | optional ("near X market") |
| is_default | BOOLEAN | NOT NULL DEFAULT false | |
| created_at, updated_at | TIMESTAMP | | |

Index: `idx_addresses_user` on `(user_id)`.

Phase 9 migration: drop `line1`, `line2`, `region`, `postal`, `country`; add `division`, `township`, `street`, `landmark`. Existing rows backfilled to `division='Yangon'`, `city='Yangon'`, `township='unknown'`, `street=COALESCE(line1, '')` then manually corrected (single-admin shop).

### `divisions`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(40) | PK | slug: `yangon`, `mandalay`, `naypyidaw`, … |
| name | VARCHAR(60) | NOT NULL | "Yangon Region" |
| delivery_fee_mmk | BIGINT | NOT NULL | BeeExpress flat fee |
| cod_allowed | BOOLEAN | NOT NULL DEFAULT false | true only for Yangon, Mandalay |
| is_blocked | BOOLEAN | NOT NULL DEFAULT false | true for Kayah, Kayin, Sagaing — no BeeExpress coverage |
| sort_order | INT | NOT NULL DEFAULT 0 | dropdown order |
| created_at, updated_at | TIMESTAMP | | |

Seeded with all 15 Myanmar divisions. Blocked rows still exist; dropdown filters `is_blocked = false`.

### `payment_methods`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(40) | PK | `kbz_pay`, `aya_pay`, `uab_pay`, `kbz_bank`, `cod` |
| name | VARCHAR(60) | NOT NULL | "KBZ Pay" |
| kind | ENUM('wallet','cod') | NOT NULL | controls UI surface |
| account_name | VARCHAR(120) | NULL | owner's name on the wallet account |
| account_phone | VARCHAR(20) | NULL | merchant phone for transfer |
| qr_image_url | VARCHAR(255) | NULL | `/payment-qr/<id>.webp` |
| instructions_md | TEXT | NULL | extra notes shown on order page |
| sort_order | INT | NOT NULL DEFAULT 0 | |
| is_active | BOOLEAN | NOT NULL DEFAULT false | hidden when false; methods incomplete (missing account info or QR) silently hidden too |
| created_at, updated_at | TIMESTAMP | | |

### `carts`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | |
| user_id | CHAR(36) | NULL, FK → users.id ON DELETE CASCADE | NULL for guest |
| session_id | CHAR(36) | NULL | cookie value for guest carts |
| updated_at | TIMESTAMP | NOT NULL DEFAULT now() ON UPDATE now() | |

Constraint: exactly one of `user_id` or `session_id` is non-null.
Indexes: `idx_carts_user`, `idx_carts_session`.

### `cart_items`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| cart_id | CHAR(36) | NOT NULL, FK → carts.id ON DELETE CASCADE | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE CASCADE | |
| qty | INT | NOT NULL, 1-99 | |
| added_at | TIMESTAMP | NOT NULL DEFAULT now() | |

PK: `(cart_id, product_id)`.

### `wishlists`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| user_id | CHAR(36) | NOT NULL, FK → users.id ON DELETE CASCADE | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE CASCADE | |
| added_at | TIMESTAMP | NOT NULL DEFAULT now() | |

PK: `(user_id, product_id)`. Guests use localStorage only; merge on login.

### `orders`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | also used as payment reference |
| user_id | CHAR(36) | NOT NULL, FK → users.id | |
| status | ENUM('pending_payment','payment_submitted','confirmed','paid','shipped','delivered','cancelled') | NOT NULL DEFAULT 'pending_payment' | wallet path: `pending_payment` → `payment_submitted` → `paid` → `shipped` → `delivered`. COD path: `pending_payment` → `confirmed` → `shipped` → `delivered`. Any → `cancelled`. |
| subtotal_mmk | BIGINT | NOT NULL, ≥ 0 | items only |
| delivery_fee_mmk | BIGINT | NOT NULL, ≥ 0 | snapshot from `divisions.delivery_fee_mmk` at order time |
| total_mmk | BIGINT | NOT NULL, ≥ 0 | `subtotal_mmk + delivery_fee_mmk` |
| shipping_address_id | CHAR(36) | NULL, FK → addresses.id ON DELETE SET NULL | |
| payment_method_id | VARCHAR(40) | NOT NULL, FK → payment_methods.id ON DELETE RESTRICT | |
| payment_proof_url | VARCHAR(255) | NULL | `/slips/<orderId>/<uuid>.webp` once uploaded |
| payment_tx_ref | VARCHAR(120) | NULL | optional customer-entered wallet tx ID |
| payment_ref | VARCHAR(64) | NULL | mirror of order UUID by default; owner can overwrite with bank-side ref |
| expires_at | TIMESTAMP | NOT NULL | `placed_at + 24h`; auto-cancel cron checks this |
| notes | TEXT | NULL | customer notes / admin notes |
| placed_at | TIMESTAMP | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT now() ON UPDATE now() | |

Indexes: `idx_orders_user`, `idx_orders_status`, `idx_orders_placed`, `idx_orders_expires` (`status, expires_at`) for the auto-cancel cron.
Removed: `billing_address_id` (single-address checkout is sufficient at retail volume).

### `order_items`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGINT | PK AUTO_INCREMENT | |
| order_id | CHAR(36) | NOT NULL, FK → orders.id ON DELETE CASCADE | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE RESTRICT | |
| qty | INT | NOT NULL, ≥ 1 | |
| unit_price_mmk_snapshot | BIGINT | NOT NULL | price at time of order |
| name_snapshot | VARCHAR(120) | NOT NULL | product name at time of order |

Snapshots preserve order history if product price/name changes later.

### `reviews`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE CASCADE | |
| user_id | CHAR(36) | NOT NULL, FK → users.id ON DELETE CASCADE | |
| rating | TINYINT | NOT NULL, 1-5 | |
| title | VARCHAR(120) | NULL | |
| body | TEXT | NOT NULL | 10-2000 chars |
| status | ENUM('pending','approved','rejected') | NOT NULL DEFAULT 'pending' | |
| verified_purchase | BOOLEAN | NOT NULL DEFAULT false | auto-set if user has matching order_item |
| created_at | TIMESTAMP | NOT NULL DEFAULT now() | |

Constraint: `UNIQUE(product_id, user_id)` — one review per product per user.
Index: `idx_reviews_product_status`.

### `newsletter_subscribers`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | |
| email | VARCHAR(254) | UNIQUE NOT NULL | |
| source | VARCHAR(40) | NOT NULL DEFAULT 'homepage' | which form |
| status | ENUM('active','unsubscribed') | NOT NULL DEFAULT 'active' | |
| subscribed_at | TIMESTAMP | NOT NULL DEFAULT now() | |
| unsubscribed_at | TIMESTAMP | NULL | |

---

## Relationships

```
categories 1 ── ∞ products
products   1 ── ∞ product_specs
products   1 ── ∞ cart_items
products   1 ── ∞ order_items (RESTRICT — keep history)
products   1 ── ∞ wishlists
products   1 ── ∞ reviews

users      1 ── ∞ addresses
users      1 ── ∞ carts
users      1 ── ∞ orders
users      1 ── ∞ reviews
users      1 ── ∞ wishlists

carts      1 ── ∞ cart_items
orders     1 ── ∞ order_items
orders     0 ── 1 shipping_address (addresses)
orders     0 ── 1 billing_address (addresses)
```

## Enums + constants
```ts
type OrderStatus = 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled'
type ReviewStatus = 'pending' | 'approved' | 'rejected'
type UserRole = 'customer' | 'admin'
type Currency = 'MMK'

const QTY_MIN = 1
const QTY_MAX = 99
const SEARCH_QUERY_MAX = 200
const REVIEW_BODY_MIN = 10
const REVIEW_BODY_MAX = 2000
const RATING_MIN = 1
const RATING_MAX = 5
const PASSWORD_MIN = 10
const BCRYPT_ROUNDS = 12
const VERIFICATION_TOKEN_TTL_MIN = 30
const PASSWORD_RESET_TTL_MIN = 15
const SESSION_DAYS = 30
```

## Validation (zod, at route boundary)
- `productSlug`: `/^[a-z0-9-]+$/`, 1-80 chars
- `email`: RFC 5322 simplified, ≤ 254 chars
- `password`: ≥ 10 chars, requires lowercase + uppercase + digit
- `cartItemQty`: int, 1-99
- `addressPhone`: E.164 regex
- `addressPostal`: 3-20 chars, alnum + dash + space
- `reviewRating`: int, 1-5
- `reviewBody`: trimmed, 10-2000 chars, HTML stripped
- `newsletterEmail`: same email rule + lowercased before insert

## Soft delete strategy
- Products: `is_active = false` to hide; do not hard-delete (order_items reference).
- Reviews: `status = 'rejected'` to hide.
- Users: hard-delete via DSAR request (cascades to addresses/cart/wishlist; orders retain `user_id` via SET NULL on user delete? **TBD — keep restrict for now to preserve sales records.**).
- Categories: deletion blocked if any active product references it.

## Audit fields standard
- All tables that mutate: `created_at`, `updated_at`.
- No `created_by` / `updated_by` in MVP — single-admin model.

## Auth model
- Auth.js v5 JWT strategy. Session token in `httpOnly`, `secure`, `sameSite=lax` cookie. 30-day rolling.
- Password hash: bcrypt rounds 12.
- Email verification required before sign-in completes.
- Password reset: token in `verification_tokens`, 15-min TTL, single-use.

## File/media storage
- Product photos: `public/products/{slug}/{01-04}.webp` on the filesystem (no DB rows).
- Build script `scripts/check-photos.ts` scans each folder and updates `products.has_photos = true` if `01.webp` exists.
- Gallery component reads from `/products/{slug}/{01..04}.webp` and 404-tolerant: hides slots that 404 (via `onError` swap to swatch).
- Naming: `^0[1-4]\.webp$`. Max file size 2 MB. Owner generates WebP locally with `cwebp -q 82`.
- Future: lift to R2/S3 by changing one base URL constant. Folder structure already matches `s3://bucket/products/{slug}/01.webp`.

## Caching layer
- Catalog reads: `unstable_cache` wrapping Drizzle queries, tagged `products`, `category:{id}`. Revalidate every 60s + on demand via `revalidateTag` after Studio writes (manual trigger).
- Cart, orders, wishlist: no cache (per-user, mutating).
- Search index (Fuse): client-side, refreshed on page reload.

## Background jobs
- Phase 4-7 has no queue. Tasks run inline:
  - Order confirmation email: awaited in checkout handler (acceptable < 500ms via Hostinger SMTP).
  - Low-stock alert email: triggered inline on order success if any item drops below `low_stock_threshold` — owner gets one mail per breach.
  - Newsletter blast: out of scope; owner CSV-exports and uses Hostinger Webmail.

## Migration strategy
- Drizzle Kit migrations in `src/db/migrations/`.
- Naming: timestamp prefix + description (auto-generated by `drizzle-kit generate`).
- Always run `drizzle-kit generate` then review the SQL before commit.
- Rollback: write a paired down migration before merging up.
- Production: run migrations via SSH on Hostinger before swapping the Node app version.

---

## API

### Status
**Phase 4 = filesystem photos only (no API change).**
**Phase 5+ = live API replacing inline JSON.**

### Base URL + versioning
- All endpoints under `/api/v1/...`.
- Backward compatibility: deprecate, never silently remove; minimum 90 days notice in PRs.

### Auth method
- JWT in `httpOnly` cookie via Auth.js. Server reads `auth()` helper.
- Public read endpoints unauthenticated.
- All mutations require an active session OR a same-origin guest cart cookie for cart endpoints.

### Endpoint table

**Catalog (public reads)**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/products` | List active products (filter `?category=`, sort `?sort=`) | No |
| GET | `/api/v1/products/[slug]` | One product (active only) | No |
| GET | `/api/v1/categories` | List categories | No |
| GET | `/api/v1/categories/[id]/products` | Products in category | No |
| GET | `/api/v1/search?q=` | Server search (FULLTEXT fallback to Fuse client) | No |

**Cart**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/cart` | Current cart (session-keyed) | No |
| POST | `/api/v1/cart/items` | Add item `{productId, qty}` | No |
| PATCH | `/api/v1/cart/items/[productId]` | Set qty `{qty}` | No |
| DELETE | `/api/v1/cart/items/[productId]` | Remove item | No |
| POST | `/api/v1/cart/merge` | Merge guest cart into user cart (called post-login) | Yes |

**Wishlist**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/wishlist` | List wishlist items | Yes |
| POST | `/api/v1/wishlist/[productId]` | Add | Yes |
| DELETE | `/api/v1/wishlist/[productId]` | Remove | Yes |
| POST | `/api/v1/wishlist/merge` | Merge guest localStorage wishlist | Yes |

**Addresses**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/addresses` | List own addresses | Yes |
| POST | `/api/v1/addresses` | Create | Yes |
| PATCH | `/api/v1/addresses/[id]` | Update | Yes |
| DELETE | `/api/v1/addresses/[id]` | Delete | Yes |

**Orders**
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/orders` | Place order from current cart. Body: `{shippingAddressId \| newAddress, paymentMethodId, notes?}`. Server snapshots delivery_fee from `divisions`, sets `expires_at = now() + 24h`, decrements `stockQty` in a transaction. | Yes |
| GET | `/api/v1/orders` | List own orders | Yes |
| GET | `/api/v1/orders/[id]` | Get one (IDOR-checked) | Yes |
| POST | `/api/v1/orders/[id]/slip` | Upload payment proof (multipart, image ≤ 8MB). Server validates magic-byte, stores under `public/slips/<orderId>/`, sets `payment_proof_url` + `payment_tx_ref` (optional), flips status `pending_payment` → `payment_submitted`. Rejects if status not `pending_payment` or method `kind = 'cod'`. | Yes |
| POST | `/api/v1/orders/[id]/cancel` | Customer-initiated cancel. Allowed only when `status = 'pending_payment'`. Restores `stockQty` in a transaction. | Yes |

**Payment methods**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/payment-methods` | Public list of active + complete methods (no missing account info or QR). Used by checkout. | No |

**Divisions**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/divisions` | Public list of non-blocked divisions with `delivery_fee_mmk` + `cod_allowed`. Used by checkout address form. | No |

**Reviews**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/products/[slug]/reviews` | Approved reviews for product | No |
| POST | `/api/v1/products/[slug]/reviews` | Submit review (status pending), auto verified-purchase | Yes |

**Newsletter**
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/newsletter` | Subscribe (rate-limit 5/hr/IP); reactivates if previously unsubscribed | No |
| GET | `/api/v1/newsletter/unsubscribe?token=` | Unsubscribe via email link | No |

**Auth (Auth.js handled)**
- All under `/api/auth/*` — sign in, sign out, callback (Google), CSRF, verify-request, error.

**Custom auth helpers**
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | bcrypt(12) password hash + email verification token | No |
| POST | `/api/v1/auth/verify` | Consume verification token + flip `email_verified` | No |

**Admin (Phase 8 — `users.role = 'admin'` required)**
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/admin/products` | Create new product. Body: `{slug, name, categoryId, priceMmk, tagline, description, swatch, stockQty, lowStockThreshold, featured, isActive, specs[]}`. Slug regex `^[a-z0-9-]+$`, uniqueness checked server-side. `id = slug`. Inserts product + spec rows in a transaction. Revalidates `products` cache tag. | Admin |
| PATCH | `/api/v1/admin/products/[id]` | Full or partial update of product columns and specs. Same body shape as POST minus id. Revalidates cache. | Admin |
| POST | `/api/v1/admin/products/[id]/photos/[slot]` | Multipart upload of slot ∈ {01, 02, 03, 04}. JPG/PNG/WEBP ≤ 10 MB. `sharp` writes two files: `public/products/<slug>/0X.webp` (1600×1600 max, EXIF stripped) and `0X-thumb.webp` (600×600 max). Flips `products.has_photos = true` on the first slot-01 upload. Replaces any existing pair atomically. Rate-limit 30/hr/admin. | Admin |
| DELETE | `/api/v1/admin/products/[id]/photos/[slot]` | Removes the hero + thumb pair for one slot. If the slot deleted was 01 and no other slots remain, sets `has_photos = false`. | Admin |
| PATCH | `/api/v1/admin/orders/[id]` | Update `status`. Allowed transitions enforced server-side per status machine. Wallet: `payment_submitted` → `paid` → `shipped` → `delivered`. COD: `pending_payment` → `confirmed` → `shipped` → `delivered`. Any → `cancelled`. | Admin |
| PATCH | `/api/v1/admin/reviews/[id]` | Update `status` (`pending` / `approved` / `rejected`). | Admin |
| GET, POST, PATCH, DELETE | `/api/v1/admin/payment-methods[/[id]]` | CRUD + QR upload. QR is optional — a wallet/bank method is "complete" with just account_name + account_phone. Validates kind enum, regex on account_phone. | Admin |
| PATCH | `/api/v1/admin/divisions/[id]` | Edit `delivery_fee_mmk`, `cod_allowed`, `is_blocked`, `sort_order`. Name + id immutable. | Admin |

### Request/response example

```json
// GET /api/v1/products/mxk-65-walnut
{
  "data": {
    "id": "mxk-65-walnut",
    "slug": "mxk-65-walnut",
    "name": "MXK-65 Walnut",
    "category": "keyboards",
    "priceMmk": 520000,
    "tagline": "65 percent hot-swap with a walnut top case.",
    "description": "…",
    "specs": [{ "label": "Layout", "value": "65 percent" }],
    "swatch": "#9C7A55",
    "stockQty": 8,
    "lowStockThreshold": 3,
    "hasPhotos": true,
    "featured": true,
    "reviews": { "count": 12, "average": 4.6 },
    "createdAt": "2026-06-15T00:00:00Z",
    "updatedAt": "2026-06-15T00:00:00Z"
  },
  "error": null
}
```

### Error response format
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid product slug.",
    "details": { "field": "slug", "reason": "regex_mismatch" },
    "status": 400
  }
}
```

Standard error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHENTICATED`, `FORBIDDEN`, `RATE_LIMITED`, `OUT_OF_STOCK`, `CONFLICT`, `INTERNAL`.

### Rate limiting
Implemented in `src/lib/rate-limit.ts` — in-memory bucket, single instance. Swap to Upstash on horizontal scale.

| Endpoint | Limit |
|---|---|
| `POST /api/v1/newsletter` | 5/hour/IP |
| `POST /api/v1/cart/items` | 60/min/session |
| `POST /api/v1/orders` | 10/hour/user |
| `POST /api/v1/orders/*/slip` | 10/hour/user |
| `POST /api/v1/orders/*/cancel` | 5/hour/user |
| `POST /api/v1/admin/products/*/photos/*` | 30/hour/admin |
| `POST /api/v1/products/*/reviews` | 5/day/user |
| `POST /api/v1/auth/signup` | 5/hour/IP |
| `POST /api/auth/signin` (credentials, future) | 5/min/email + 20/min/IP |
| `POST /api/auth/forgot-password` (future) | 3/hour/email |

429 response includes `Retry-After` header.

### Admin actions audit
No `audit_log` table yet — admin role is single-operator in MVP, and Drizzle Studio access already requires SSH tunnel. When second admin lands, add `audit_log(actor_id, action, target_table, target_id, payload_json, created_at)` and log every `/api/v1/admin/*` mutation.

### Payment surface
- No card payments. No external gateway. Wallet apps (KBZ Pay / Aya Pay / UAB Pay) + Cash on Delivery only.
- Each wallet/bank method is a row in `payment_methods` with owner-provided account name + account phone (or bank account number). QR is optional — if `qr_image_url` is null the order page hides the QR slot and renders account info at full width. Customer scans the QR (or types the account number manually), transfers exact MMK amount, returns to `/order/[id]`, uploads slip image (and optional tx ref) → `status='payment_submitted'`.
- Owner verifies in bank app → flips to `paid` from `/admin/orders/[id]`. State transitions are idempotent.
- COD: no slip. Status `pending_payment` → owner phone confirms → `confirmed` → ship → `delivered`. Driver collects cash at door.
- Auto-cancel cron (`scripts/cancel-expired-orders.ts`, runs nightly) sets `status='cancelled'` and restores `stockQty` where `status='pending_payment' AND expires_at < NOW()`.
- Slip file storage: `public/slips/<orderId>/<uuid>.webp` (client-resized to 1600px before upload, magic-byte validated server-side, 8MB cap).
