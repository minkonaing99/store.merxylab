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

Two of these were written after the bug they describe shipped — the COD status label and the `getStaleDays` default. That is the point of them.

## What is deliberately not covered

**Stock commit and release** inside the order `PATCH` transaction. It needs a real MySQL to mean anything; a Drizzle mock would only assert that the mock works. The right tool is a Playwright run against a seeded database — worth building when order volume justifies it, not before.

**Components and pages.** No jsdom, no React Testing Library. Add them when a component holds logic worth asserting; today they mostly render props.

## Coverage

The global number is low (~9%) and that is expected: the report includes every DB and IO module, none of which is unit-testable without integration setup. The numbers that matter are on the pure modules — validators, transitions, status labels, rate limit — which sit at 90–100%.

No thresholds are enforced yet. Add them once integration tests exist, otherwise every unrelated new file fails the build.

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

1. `npm ci` on Node 20 with npm cache
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build` with dummy env (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`)

The build needs no real database — every DB-backed page is `force-dynamic`, so nothing queries at build time. A syntactically valid dummy URL is enough. Verified locally by building with `.env.local` moved aside.

A second job runs **gitleaks** over the repository to catch committed credentials. Concurrency is set so a newer push cancels the older run on the same branch.

## Adding a test

1. Put the file next to the source, named `*.test.ts`.
2. Mock at the module boundary, not inside the unit — `vi.mock('@/db', ...)` beats threading a fake client through the function signature.
3. If a route handler needs a request, build a real `Request`. They are plain functions; no server needed.
4. Rate-limited routes keep state in a module-level Map — give each test its own `x-forwarded-for` or they bleed into each other.
