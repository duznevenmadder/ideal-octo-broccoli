# Setup & Run (Phase 1 — Foundation)

## Stack
- Next.js 16 (App Router, TypeScript) + Tailwind
- Prisma 6 + **SQLite** (`prisma/dev.db`) — zero-credential local dev
- No auth yet: a single seeded user (`keeling.taylor@gmail.com`). All data is
  scoped through `getCurrentUser()` in `src/lib/user.ts` — the seam to replace
  when auth is added.

## First-time setup
```bash
npm install
npm run db:migrate    # prisma migrate dev — creates dev.db + tables
npm run db:seed       # seed user, 11 accounts, IRA schedule, goals (idempotent)
npm run dev           # http://localhost:3000  → redirects to /accounts
```

Useful: `npm run db:studio` (Prisma Studio), `npm run build` (type-check + lint).

## What works in Phase 1
- `/accounts`: list accounts, total assets, add account, edit account, inline
  balance update. (`src/app/accounts/page.tsx`, `src/lib/actions/accounts.ts`)

## Auth (optional password gate)
Set `APP_PASSWORD` (and a random `SESSION_SECRET`) in `.env` to require a password.
`src/middleware.ts` then redirects unauthenticated requests to `/login`; a signed
httpOnly cookie holds the session, and a **Log out** button appears in the nav.
If `APP_PASSWORD` is unset, the gate is bypassed and the app stays open (single
seeded user). This is a single-user gate, not multi-tenant auth — for real
multi-user, replace `getCurrentUser()` and add Clerk/NextAuth.

## Importing statements (CSV / PDF)
`/import` (nav: **Import**) bulk-loads transactions from a bank or credit-card
export — entirely local, nothing is sent anywhere.
- **CSV:** upload → columns are auto-detected (date / description / amount, or
  separate debit/credit) → adjust the mapping if needed → review the editable
  preview → import into a chosen account. "Invert sign" handles credit-card
  exports where charges are positive. Categories are auto-guessed from the
  description (`src/lib/import/categorize.ts`) and editable per row.
- **PDF:** text is extracted (`pdf-parse`) and lines with a date + amount are
  pulled into the same preview. This is **best-effort** — layouts vary per bank,
  so review every row. CSV is preferred when your institution offers it.
- Core logic is unit-testable (`src/lib/import/parse.ts`, `insert.ts`); the
  server actions live in `src/lib/actions/import.ts`.

## Reports / PDF export
`/reports` renders a print-optimized monthly report (net worth, cash flow, accounts,
tax/IRA, goals). Click **Save as PDF / Print** — print CSS (`globals.css`, `@media
print`) drops the nav and forces a clean light layout, then use the browser's
"Save as PDF".

## Plaid bank sync (optional, scaffold)
Feature-flagged on `PLAID_CLIENT_ID` + `PLAID_SECRET` + `PLAID_ENV`. When set, the
Accounts page shows **Connect a bank (Plaid)**, which fetches a Plaid `link_token`
(`src/lib/plaid.ts`, `src/lib/actions/plaid.ts`). Remaining wiring to finish a live
integration (not done here — needs credentials + browser testing):
1. `npm install react-plaid-link` and mount `<PlaidLink>` with the `link_token`.
2. On success, send the returned `public_token` to a server action that calls
   `exchangePublicToken()` and stores the `access_token` per item.
3. Pull balances/transactions via Plaid's `/accounts/balance/get` and
   `/transactions/sync`, mapping them onto `Account`/`Transaction` rows.

## Notes on the SQLite port
SQLite via Prisma has no native `enum` or `@db.Decimal(p,s)`. So:
- Enum fields are `String` columns; allowed values + labels live in
  `src/lib/enums.ts` (single source of truth for selects + validation).
- `Decimal` is used without native attributes.

## Upgrade path → Postgres/Neon (per README target)
1. In `prisma/schema.prisma`: set `provider = "postgresql"`, restore `enum`
   blocks and `@db.Decimal(p,s)` attributes.
2. Point `DATABASE_URL` (`.env`) at the Neon connection string.
3. `npm run db:migrate` to create a fresh migration.
4. Add Clerk/NextAuth and replace the body of `getCurrentUser()`.
