# Testing

Vitest, Node environment, no jsdom. The risk in this codebase is logic — status transitions, money, phone normalisation, input guards — not markup.

## Commands

| Command | Use |
| ------- | --- |
| `npm test` | Run once. What CI runs. |
| `npm run test:watch` | Re-runs on save while working. |
| `npm run test:coverage` | Text summary + `coverage/` HTML report (gitignored). |

## Layout

Tests sit **beside the code**, `src/lib/validators.test.ts` next to `src/lib/validators.ts`. Vitest finds them with no config, a rename moves both, and nothing imports them so they never reach the Next bundle.

`vitest.config.mts` does two things worth knowing:

- Aliases `@/` and `@emails` so tests resolve the same paths the app does.
- Stubs the `server-only` package (`src/test/server-only-stub.ts`). Without it, importing `admin-orders.ts` or `site-info.ts` throws — that package exists to blow up outside a React Server Component.

## What is covered

| Suite | Guards |
| ----- | ------ |
| `lib/order-transitions.test.ts` | Every legal status move, per payment kind. Cancel is terminal. The admin dropdown never offers cancel as a new choice. |
| `lib/validators.test.ts` | Phone normalisation (six input shapes → one stored form), E.164 idempotency, password rules, email. |
| `lib/order-status.test.ts` | Customer wording for all 10 status × payment-kind combinations. Locks the COD "Awaiting payment" bug shut. |
| `lib/admin-orders.test.ts` | `?status=` and `?page=` guards, LIKE-wildcard escaping, stale-days clamping and defaults. |
| `lib/money.test.ts` | MMK formatting, cart quantity clamping, relative-time labels. |
| `api/v1/contact/route.test.ts` | Validation rejects, honeypot, rate limit at 5/hour, mail contents. |
| `lib/report-error.test.ts` | Alert contents, 10-minute throttle per fault, HTML escaping, never throws. |
| `lib/rate-limit.test.ts` | `X-Forwarded-For` hop selection (a forged chain cannot mint a bucket), window counting, and bucket-store eviction at the 10,000-key cap. |
| `lib/admin-guard.test.ts` | Role comes from the database, not the token: a JWT still claiming `admin` after revocation gets 403, a promotion the token predates is honoured, a deleted user row reads as signed out. |
| `lib/telegram.test.ts` | Plain text by default (an awkward character cannot make Telegram reject an order alert), markup only on opt-in, silent when unconfigured, swallows an outage. |
| `api/v1/orders/route.test.ts` | **Checkout.** Prices come from the catalog and division even when the body carries `subtotalMmk`/`totalMmk`; address ownership; blocked divisions; the COD cap; stock refusal; and that a rejected checkout leaves no address behind. Also that the Telegram alert carries no street, phone, or raw email. |
| `api/v1/admin/orders/[id]/route.test.ts` | **Stock movement.** Decrement on confirm, restore on cancel-from-confirmed, no movement on cancel-from-pending, and 409 when the conditional decrement matches no row. Plus the invoice/delivered/cancelled/low-stock mails. |
| `api/v1/auth/signup/route.test.ts` | Verification token stored as a SHA-256 digest, not as mailed; a verified account with a password is never written to; a taken address answers identically to a fresh one; password character classes. |
| `api/v1/auth/verify/route.test.ts` | Token match/miss, length guard, and the 10/hour limiter. |
| `api/v1/orders/[id]/slip/route.test.ts` | Owner-or-admin read (including the revoked-admin case), non-slip stored values refused, upload size/MIME/decode guards, upstream failure leaves the order unadvanced, prior slip deleted on replace. |
| `api/v1/addresses/[id]/route.test.ts` | Ownership scoping, the confirmed-order address lock on both edit and delete, telegram/maps normalisation, cleared optionals stored as `null`. |
| `api/v1/cart/items/[productId]/route.test.ts` | Slug guard, qty range, and that update/remove share the 60/min cart budget. |
| `app/sitemap.test.ts` | Static routes still render when the catalog read throws — the case that used to fail the CI build. |

Two of these were written after the bug they describe shipped — the COD status label and the `getStaleDays` default. That is the point of them.

## What is deliberately not covered

**Stock commit and release against a real database.** The branch logic inside the order `PATCH` transaction *is* now covered (`api/v1/admin/orders/[id]/route.test.ts`) with the driver mocked, including the `affectedRows === 0` refusal — the mock returns `[{ affectedRows }]` precisely because the route reads `res[0]`, not `res`, and that unwrapping has been wrong before. What is still untested is the actual SQL: whether MySQL really refuses the conditional `UPDATE` under concurrency. That needs a seeded database and a Playwright or integration run, worth building when order volume justifies it.

**Components and pages.** No jsdom, no React Testing Library. Add them when a component holds logic worth asserting; today they mostly render props.

**The remaining API routes** — wishlist, reviews, and the admin CRUD for products, divisions, payment methods, and settings. These are thin zod-then-write handlers behind a now-tested `requireAdmin()`, where a regression costs a 500 rather than money or data. Testing them would move the global percentage without adding much safety.

## Coverage

The global number is ~42%, and the shape matters more than the figure: the report includes every DB and IO module, much of which is not unit-testable without integration setup. The routes where a silent regression costs money or leaks data are the ones carried high — checkout 91%, admin order status 97%, signup 100%, verify 100%, slip 97%, addresses 100%, `admin-guard` 100%, `rate-limit` 100%.

No thresholds are enforced yet. Add them once integration tests exist, otherwise every unrelated new file fails the build.

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

1. `npm ci` on Node 20 with npm cache
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build` with dummy env (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`)

The build needs no real database, but **not** because nothing queries at build time — that claim was wrong and broke this job. `/sitemap.xml` is statically generated and reads the catalog, so with an unreachable database the query threw and the export failed, taking the whole build with it. `src/app/sitemap.ts` now catches that and emits the static and category routes without the product URLs; the catalog read is cached with a 60-second revalidate, so a sitemap built without products fills them in on the first request that can reach the database. `app/sitemap.test.ts` covers the throwing case.

Every other DB-backed page is `force-dynamic`, so a syntactically valid dummy URL is enough for them. Verify locally with:

```
DATABASE_URL=mysql://ci:ci@127.0.0.1:3306/ci AUTH_SECRET=x \
NEXT_PUBLIC_SITE_URL=https://example.com npx next build
```

**Then delete `.next`.** A production build and `next dev` write incompatible layouts to the same directory — production puts middleware at `.next/server/src/middleware.js`, dev expects `.next/server/middleware.js` — so a dev server started over a production build dies with `ENOENT ... middleware.js`.

A second job runs **gitleaks** over the repository to catch committed credentials. Concurrency is set so a newer push cancels the older run on the same branch.

## Adding a test

1. Put the file next to the source, named `*.test.ts`.
2. Mock at the module boundary, not inside the unit — `vi.mock('@/db', ...)` beats threading a fake client through the function signature.
3. If a route handler needs a request, build a real `Request`. They are plain functions; no server needed.
4. Rate-limited routes keep state in a module-level Map — give each test its own `x-forwarded-for` or they bleed into each other.
