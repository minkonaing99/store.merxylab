# user-testing — merxylab

Manual and browser-automation test plan. Written to be handed to a browser extension or
worked through by a person, one suite at a time.

Every parameter below was read out of the running database and source, not assumed. Where
a value will drift (stock counts, order ids) the doc says how to re-read it rather than
hard-coding it.

Last verified against the local database: 2026-08-17.

---

## 0. Credentials — read this first

**No password goes in this file.** `docs/` is tracked in git, so anything written here is
committed and pushed. Put test credentials in `.env.test.local`, which
`.gitignore` already excludes (the `.env*` rules catch every variant):

```bash
# .env.test.local — never committed
TEST_BASE_URL="http://localhost:3000"
TEST_CUSTOMER_EMAIL="..."
TEST_CUSTOMER_PASSWORD="..."
TEST_ADMIN_EMAIL="..."
TEST_ADMIN_PASSWORD="..."
```

Three things about the credential handed over for this plan:

1. **It is the same string as the MySQL root password.** One leak becomes two. The
   database account and an application account should never share a secret.
2. **It is the owner's real address**, not a throwaway. Test runs create orders, reviews
   and addresses against it, and a failed destructive test hits real data.
3. **It is not an admin account.** See section 2.

Recommended: create a dedicated `qa+store@…` customer and a dedicated admin, and rotate
the shared password. The suites below name accounts by role, so swapping them is a
one-line change in `.env.test.local`.

**A browser agent cannot type passwords.** Claude in Chrome will not enter credentials
into a field. Either a human performs the sign-in step and hands the authenticated tab to
the agent, or a password manager fills it. Every suite below that needs a session starts
from "already signed in as X" for that reason.

---

## 1. Environment

```bash
npm run dev                # http://localhost:3000
# or, to test what actually ships:
npm run build && npm start
```

**Test against a production build for anything about speed, status codes or streaming.**
`next dev` compiles routes on first hit, so a cold click looks like 2-7 seconds of
latency that does not exist in production. It also behaves differently around streamed
responses, which is where the soft-404 class of bug lives.

Reset to a known state:

```bash
mysql -u root -p <database> < docs/db-bootstrap.sql   # schema + divisions + payment methods, no catalog
```

Then grant an admin and add products through `/admin/products`.

---

## 2. Prerequisites that currently block two suites

### 2a. No admin account for the supplied credential

Roles in the local database right now: **3 customers, 1 admin.** The address supplied for
testing is one of the customers. Every `/admin/*` route calls `requireAdmin()` and
`notFound()`s otherwise, so Suite G will 404 on every step until this is fixed.

```sql
UPDATE users SET role = 'admin' WHERE email = '<the test address>';
```

Sign out and back in afterwards: the role is carried in the JWT, so an existing session
keeps the old value until it is reissued.

### 2b. Every wallet payment method is inactive and unconfigured

| id | kind | is_active | account info | QR |
|---|---|---|---|---|
| `kbz_pay` | wallet | 0 | none | none |
| `aya_pay` | wallet | 0 | none | none |
| `uab_pay` | wallet | 0 | none | none |
| `kbz_bank` | wallet | 0 | none | none |
| `cod` | cod | **1** | n/a | n/a |

Checkout hides methods that are inactive *or* incomplete, so **only Cash on Delivery is
selectable** and Suite E (wallet payment, slip upload, `payment_submitted`) cannot run.

To enable one: `/admin/payment-methods` → pick `kbz_pay` → fill account name and account
phone, upload a QR image, toggle Active, Save.

---

## 3. Breakpoints

From `docs/DESIGN.md`. The layout is mobile-first, so test narrow upward.

| Name | Width | Device to emulate | What changes |
|---|---|---|---|
| — | **360 × 800** | Small Android | Baseline. Nav collapses to hamburger, 1-col product grid, order-progress rail goes vertical, checkout summary sits above the form. |
| `sm` | **640** | Large phone | Product grid → 2 columns. Field text drops 16px → 14px. |
| `md` | **768** | Tablet portrait | Desktop nav appears, hamburger hides. Account layout becomes 240px sidebar + content. Footer goes 4-column. |
| `lg` | **1024** | Tablet landscape | Product grid → 3 columns. Checkout summary moves to a sticky right rail. |
| `xl` | **1280** | Desktop | `container-prose` hits its 1280px max and starts centring with side gutters. |
| `2xl` | **1536** | Wide desktop | Nothing new; verify no stretching and gutters stay even. |

Also check **390 × 844** (iPhone 14) and **1440 × 900** (common laptop), since those are
what most real traffic will be.

At every breakpoint, on every page in the suite: no horizontal scrollbar, no text clipped,
no element overlapping another, tap targets at least 44 × 44px, and nothing relying on
hover alone.

---

## 4. Test data reference

Read live values rather than trusting this table, but these are the useful fixtures.

### Divisions

| Division | Fee | COD allowed | Blocked |
|---|---|---|---|
| Mandalay Region | Ks 3,000 | yes | no |
| Yangon Region | Ks 5,000 | yes | no |
| Bago Region | Ks 5,750 | no | no |
| Kayah State | — | no | **yes** |
| Kayin State | — | no | **yes** |
| Sagaing Region | — | no | **yes** |

Blocked divisions must not appear in the checkout dropdown at all.

### Products (local, will drift)

| Product | Price | Stock | Low-stock at |
|---|---|---|---|
| VXE Dragonfly R1 SE+ | Ks 150,000 | 17 | 3 |
| Premium DeskMat | Ks 60,600 | 16 | 4 |
| Keychron K2 Pro | Ks 545,000 | 9 | 3 |
| Edifier M230 Retro Brown | Ks 320,000 | 6 | 2 |
| Nuphy Halo65 | Ks 515,000 | 5 | 2 |
| Logitech MX Master 4 | Ks 568,000 | 5 | 2 |
| Logitech G PRO X Superlight 2 | Ks 650,000 | 4 | 2 |

Nothing is currently out of stock or below threshold, so the low-stock badge and the
disabled add-to-cart both need stock set by hand in `/admin/products`.

### COD cap: Ks 500,000 on subtotal + delivery

Ready-made pairs:

| Cart | + Mandalay fee | Total | COD offered? |
|---|---|---|---|
| VXE Dragonfly ×1 | 3,000 | 153,000 | **yes** |
| Premium DeskMat ×1 | 3,000 | 63,600 | **yes** |
| MX Master 4 ×1 | 3,000 | 571,000 | **no** (over cap) |
| G PRO X Superlight ×1 | 3,000 | 653,000 | **no** (over cap) |
| VXE Dragonfly ×1, division Bago | 5,750 | 155,750 | **no** (division) |

### Validation rules

| Field | Rule | Passing | Failing |
|---|---|---|---|
| Password | ≥10 chars, lower + upper + digit | `Quiet0nTheDesk` | `Ab1cdef`, `alllowercase1`, `ALLUPPER1` |
| Phone | `^\+959\d{7,9}$` after the `+95` prefix | `9787753307` | `123`, `0987877` |
| Telegram | 5-32 chars, letter first, `[A-Za-z0-9_]` | `min_ko_99`, `@handle5` | `abcd`, `9abcde`, `min ko`, `min/../admin` |
| Map pin | https + Google host + `/maps` path | `https://maps.app.goo.gl/aBcD1234` | `https://google.com.evil.com/maps`, `javascript:alert(1)`, `http://google.com/maps` |
| Review body | 10-2000 chars | — | 9 chars, 2001 chars |

### Rate limits (per IP unless noted)

| Action | Limit | Window |
|---|---|---|
| Sign-in attempts | 20 per IP, 10 per account | 15 min |
| Sign-up | 5 | 1 hour |
| Contact form | 5 | 1 hour |
| Place order | 10 per user | 1 hour |
| Cancel order | 5 per user | 1 hour |
| Slip upload | 10 per user | 1 hour |
| Review submit | 5 per user | 24 hours |
| Cart mutations | 60 | 1 min |

Limits are in-memory, so a server restart clears them. Run rate-limit tests last.

---

## 5. Suites

Each step is *action → expected*. Mark pass, fail or blocked, and capture a screenshot on
any fail.

### Suite A — storefront, unauthenticated

| # | Action | Expected |
|---|---|---|
| A1 | Load `/` | 200. Hero renders, featured products visible, no console errors. |
| A2 | Nav category links | Five: Keyboards, Mice, Monitors, Audio, Accessories. Each 200. |
| A3 | Footer Shop column | Same five, same order as the nav. |
| A4 | `/shop` | Filter chips render "All" plus the five. Product count line matches the number of cards. |
| A5 | `/shop/monitors` | 200, empty state "Nothing here yet." (no monitor products yet). |
| A6 | `/shop/nope` | **404**, branded not-found page, not a soft 200. |
| A7 | `/shop/KEYBOARDS` | **404**. Category ids are case-sensitive. |
| A8 | Sort dropdown on `/shop` | Featured / price asc / price desc / name A-Z each reorder the grid. |
| A9 | Product card → PDP | `/product/<slug>` 200. Gallery, specs table, price with `Ks` and thousands separators. |
| A10 | `/product/nope` | **404**. |
| A11 | `/search`, query `dragonfly` | VXE Dragonfly in results. Empty query shows the prompt, not an error. |
| A12 | `/search`, query `zzzzzz` | "No products match" empty state. |
| A13 | Add to cart from a card | Toast appears, nav cart badge increments. |
| A14 | Reload after A13 | Badge count survives (cart cookie). |
| A15 | Content pages | `/about` `/faq` `/contact` `/shipping` `/returns` `/privacy` all 200. |
| A16 | Burmese pages | `/my/faq` `/my/shipping` `/my/returns` `/my/contact` all 200, Burmese renders in Noto Sans Myanmar with no tofu boxes. |
| A17 | `/checkout` while signed out | Redirects to sign-in. |

### Suite B — sign-up and verification

| # | Action | Expected |
|---|---|---|
| B1 | `/signup`, submit empty | Inline errors on Email and Password. No request sent. |
| B2 | Email `notanemail` | "Enter a valid email address." |
| B3 | Password `Ab1cdef` | "At least 10 characters." |
| B4 | Password `alllowercase1` | Asks for an uppercase letter. |
| B5 | Password reveal toggle | Eye icon flips text/password, `aria-pressed` flips. |
| B6 | Valid new address + `Quiet0nTheDesk` | Confirmation view: "Verify your email." with the address echoed. |
| B7 | Same address again | Generic success again, **not** "account exists". Existence must not leak. |
| B8 | Verification link from the email | `/verify?token=…` → success, then sign-in works. |
| B9 | Same link twice | Second use fails cleanly. Tokens are single-use. |
| B10 | Sign in before verifying | Refused: "Invalid email or password, or the email is not verified yet." |
| B11 | Tampered token | Fails. No stack trace, no token echoed back. |

Without SMTP configured, dev prints the verification link to the server console. In
production that log is masked, by design.

### Suite C — sign-in

Sign-in itself is performed by a human or password manager, not the agent.

| # | Action | Expected |
|---|---|---|
| C1 | `/signin`, submit empty | Inline errors, no request. |
| C2 | Wrong password | **Inline red alert**, not a toast, and it stays on screen. |
| C3 | Correct credentials | Lands on `/account`. Nav account icon reflects the session. |
| C4 | Guest cart, then sign in | Cart merges. Count is guest + existing, not a reset. |
| C5 | `/signin?callbackUrl=/account/orders` | After sign-in, lands on `/account/orders`. |
| C6 | `/signin?callbackUrl=https://example.com` | **Stays on the site.** Redirects to `/account`. Open-redirect guard. |
| C7 | `/signin?callbackUrl=//example.com` | Same. Protocol-relative URLs are rejected. |
| C8 | `/signin?error=OAuthAccountNotLinked` | Inline alert: "This email already has an account. Sign in with your password below." |
| C9 | `/signin?error=TooManyRequests` | Inline alert about waiting a few minutes. |
| C10 | Google button | Present only when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set. Sits above an "or" divider, has the Google mark. |
| C11 | Keyboard only | Tab reaches every control in visual order. Focus ring is a 2px terracotta outline and pill buttons keep their radius. |
| C12 | 11 wrong passwords on one account | Blocked with the too-many-attempts message before 20. Per-account limit is 10/15min. |

### Suite D — cart and checkout, COD path

Signed in as customer.

| # | Action | Expected |
|---|---|---|
| D1 | Add VXE Dragonfly, open drawer | Line item, correct unit price, qty stepper. |
| D2 | Qty to 3 | Subtotal = 450,000. Tabular figures, no layout jump. |
| D3 | Qty to 0 / remove | Row goes, empty-cart state appears. |
| D4 | Qty above stock (17) | Rejected or clamped. Never allows ordering more than stock. |
| D5 | `/checkout` step 1 | Saved addresses listed above the new-address form. |
| D6 | Division dropdown | Kayah, Kayin, Sagaing **absent**. |
| D7 | Phone `123` | Rejected with the phone hint. Prefix `+95` is not editable or deletable. |
| D8 | Telegram `abcd` | Rejected. `min_ko_99` accepted. |
| D9 | Map pin `https://google.com.evil.com/maps` | Rejected: "Must be a Google Maps link." |
| D10 | Map pin `javascript:alert(1)` | Rejected. **No dialog appears.** |
| D11 | Map pin `https://maps.app.goo.gl/aBcD1234` | Accepted. |
| D12 | Mandalay + Dragonfly ×1 | Delivery Ks 3,000, total Ks 153,000. |
| D13 | Step 2 | Cash on Delivery offered. Wallets absent until 2b is done. |
| D14 | Swap cart to MX Master 4 (571,000 with fee) | **COD not offered.** Over the 500,000 cap. |
| D15 | Division Bago, Dragonfly ×1 | **COD not offered.** Division not COD-eligible. |
| D16 | Step 3, place order | Redirects to `/order/<uuid>?placed=1`. |
| D17 | The confirmation page | Green "Order placed. A copy is in your account." Headline "Awaiting confirmation." Body says we call within 3 hours. Address recap matches what was entered, including Telegram and map pin. |
| D18 | Reload without `?placed=1` | Success line **gone**. Status headline remains. |
| D19 | Cart after ordering | Empty. |
| D20 | Stock after ordering | **Unchanged.** Stock commits at `confirmed`, not at placement. |

### Suite E — wallet path (blocked until 2b)

| # | Action | Expected |
|---|---|---|
| E1 | Configure `kbz_pay`, then checkout | KBZ Pay selectable at step 2. |
| E2 | Place the order | `/order/<id>` shows the wallet panel: QR, account name, account phone, exact amount, order reference. |
| E3 | Copy buttons | Reference and phone copy to clipboard. |
| E4 | Upload a JPG slip | Accepted. Status → "Slip received." Thumbnail of the submitted slip renders. |
| E5 | Upload a 10MB file | Rejected client-side before any request. |
| E6 | Upload a `.txt` | Rejected. |
| E7 | Re-upload | "Replace slip" wording, old slip replaced. |
| E8 | Slip URL while signed out | Not publicly readable. Slips are private-bucket, served through an authed route. |
| E9 | Another customer requests that slip URL | Denied. |

### Suite F — account and order lifecycle

| # | Action | Expected |
|---|---|---|
| F1 | `/account` | Name or email as the heading, recent orders listed. |
| F2 | `/account/orders` | Every order for this user only. |
| F3 | `/account/orders/<id>` | Status as the display headline. Order id short form (8 chars) in mono. Date reads `17 Aug 2026, 20:52` — no seconds, no `8/17/2026`. |
| F4 | Another user's order id in that URL | **404.** Ownership is scoped in the query. |
| F5 | Money block | Item rows, subtotal, delivery, then Total larger with a heavier rule. Prices right-aligned within a ~42rem column. |
| F6 | `/account/addresses`, add an address | Saves. Telegram shows as plain `@handle` text, **not a link**. Map pin is a link opening in a new tab with `rel="noopener"`. |
| F7 | Delete an address with no confirmed order | Deletes. |
| F8 | Set an order to `confirmed` in admin, then delete its address | **409** with "This address is on a confirmed order that is out for delivery." Toast shows that message, not a generic failure. |
| F9 | Edit that same address | Also 409. |
| F10 | After the order is `delivered`, retry the delete | Allowed. The lock is only for `confirmed`. |
| F11 | Edit the address used by an older order, then reopen that order | Order still shows the **original** address. Snapshot, not a join. |
| F12 | Cancel a `pending_payment` order | Status → Cancelled. Cancel control disappears. |
| F13 | Wishlist heart on a card, then `/account/wishlist` | Product listed. Heart is filled on the card. |
| F14 | Sign out | Session cleared. `/account` redirects to sign-in. |

### Suite G — admin (blocked until 2a)

Signed in as admin.

| # | Action | Expected |
|---|---|---|
| G1 | `/admin` as a **customer** | **404**, not a redirect and not a permission message. |
| G2 | `/admin` as admin | KPI tiles, each clicking through to its page. |
| G3 | `/admin/products` → New product | Category select lists exactly five, from `src/lib/categories.ts`. |
| G4 | Type a name | Slug auto-fills, slugified. |
| G5 | Save with an existing slug | Rejected. Slug is unique. |
| G6 | Save with price `-1` or `abc` | Rejected. |
| G7 | Edit photos → upload to slot 01 | 1600px hero and 600px thumb both written, EXIF stripped, `has_photos` flips. Thumb appears on the shop card. |
| G8 | Upload a 12MB image | Rejected before the request. |
| G9 | Remove a photo slot | Slot returns to the swatch placeholder. |
| G10 | Set stock to 1 on a product with threshold 3 | Storefront card shows "Only 1 left" in warning colour. |
| G11 | Set stock to 0 | Add-to-cart disabled, "Out of stock" shown. |
| G12 | Toggle `is_active` off | Product disappears from `/shop` within the 60s catalog cache, and its PDP 404s. |
| G13 | `/admin/orders` | "Needs you" queue above the paginated ledger. COD `pending_payment` orders appear in the queue. |
| G14 | Search the ledger by order id | Filters correctly. State is in the URL and survives reload. |
| G15 | Status dropdown | **Forward-only.** Cannot move `delivered` back to `pending_payment`. |
| G16 | Set a wallet order to `confirmed` | Stock decrements per line. Invoice email sent. Low-stock alert fires if the threshold is crossed. |
| G17 | Cancel from the detail page | Two-click confirm. Stock restored. |
| G18 | Terminal rows in the ledger | Dimmed to ~45% opacity. |
| G19 | `/admin/orders/<id>` shipping block | Reads the `ship_*` snapshot. Telegram plain text, map pin as "Open map pin" link. |
| G20 | `/admin/divisions` | Edit fee, COD flag, blocked flag, sort. Name and id immutable. |
| G21 | Block a division, then reload checkout | It is gone from the dropdown. |
| G22 | `/admin/payment-methods` | Toggle active, upload QR, set account info. |
| G23 | Activate a wallet with no QR or account info | Stays hidden at checkout. Incomplete methods are filtered out. |
| G24 | `/admin/reviews` | Pending / approved / rejected / all chips filter. Approve makes a review public; reject hides it. |
| G25 | `/admin/branding` | Why-image upload replaces the homepage image. |
| G26 | Any admin API with a customer session | 403 or 404. Never a success. |

### Suite H — accessibility

Run at 360px and 1440px.

| # | Check | Expected |
|---|---|---|
| H1 | Keyboard-only pass of sign-in, checkout, admin product form | Every control reachable in visual order. No trap. |
| H2 | Focus indicator | 2px terracotta outline, 2px offset, visible on every control. Pill buttons keep their radius when focused. |
| H3 | Skip link | First Tab on any page reveals "Skip to content" and it works. |
| H4 | Field errors | Screen reader announces the error with its field (`aria-describedby` is wired). |
| H5 | Icon-only buttons | Cart, search, account, wishlist heart, password reveal, delete: all have `aria-label`. |
| H6 | Cart badge | Count change is announced (`aria-live`). |
| H7 | Cart drawer | Focus trapped inside, Esc closes, focus returns to the trigger. |
| H8 | Images | Product images have descriptive alt. Decorative shapes are `aria-hidden`. |
| H9 | Headings | One `h1` per page, no skipped levels. |
| H10 | Zoom to 200% | No content lost, no horizontal scroll. |
| H11 | `prefers-reduced-motion: reduce` | Card reveals, skeleton pulse and drawer slide all stop. |
| H12 | Contrast | See section 6 — `muted` is a known failure, do not re-report it. |

### Suite I — security behaviour

Observation only. Do not attempt exploitation beyond these read-only checks.

| # | Check | Expected |
|---|---|---|
| I1 | Console on every page | No CSP violation reports. |
| I2 | Response headers | `Content-Security-Policy` with a nonce, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. |
| I3 | `/api/v1/*` with no session | 401 on everything that needs one. |
| I4 | Any object id belonging to another user | 404 or 403, and the response body reveals nothing about it. |
| I5 | Sign-up with an existing address | Generic response. No existence disclosure. |
| I6 | Error pages | No stack traces, no SQL, no file paths. |
| I7 | Server logs in production mode | No verification links, no full email addresses. Masked to `mi****om`. |

### Suite J — responsive sweep

At each of 360, 390, 640, 768, 1024, 1280, 1440, 1536:

`/` · `/shop` · `/shop/mice` · `/product/vxe-dragonfly-r1-se` · `/cart` · `/checkout` ·
`/signin` · `/signup` · `/account` · `/account/orders/<id>` · `/order/<id>` ·
`/admin/products` · `/admin/orders`

Per page: no horizontal scroll, no clipped text, no overlap, tap targets ≥44px, images
correct aspect with no distortion, sticky nav does not cover content, and the checkout
summary sits above the form below `lg` and to the right at `lg` and up.

---

## 6. Known issues — do not re-report

| Issue | Detail |
|---|---|
| `muted` on cream is 3.32:1 | Fails WCAG AA for body text, and it is used at 12-13px for labels and metadata. Known, needs a palette decision. |
| `accent` on cream is 3.63:1 | Fine for buttons and 24px+ headings, fails for small text. Intentional. |
| Favicon invisible on light browser chrome | The icon is white on transparent. Correct on dark chrome only. |
| No forgot-password flow | A locked-out customer has no self-service path. Not built. |
| `/verify` renders at 1280px | `container-prose max-w-[480px]` — the utility's max-width wins, so the intended 480px never applies. |
| `CancelButton` uses a native `confirm()` | A blocking browser dialog, against the design system's toast rule. |
| Dev-mode first-hit latency | 2-7s on first visit to a route is webpack compiling. Test speed on a production build only. |

---

## 7. Reporting

One row per finding.

```
ID          T-<suite><number>, e.g. T-D14
Severity    blocker | major | minor | cosmetic
Route       /checkout
Viewport    390 × 844
Steps       1. … 2. … 3. …
Expected    COD not offered above the Ks 500,000 cap
Actual      COD radio still selectable
Evidence    screenshot, console output, response status
```

**Severity guide.** Blocker: money, stock, auth, or another customer's data is wrong.
Major: a flow cannot be completed. Minor: wrong copy, wrong state, missing validation
message. Cosmetic: spacing, alignment, hover.

## 8. Run order

1. Fix prerequisites (section 2), or mark E and G blocked.
2. Suite A on a production build.
3. B, then C.
4. D, then E if unblocked.
5. F, which needs orders from D.
6. G, which needs orders from D and F8.
7. H and I.
8. J.
9. Rate-limit steps (C12) last, then restart the server to clear the in-memory buckets.
