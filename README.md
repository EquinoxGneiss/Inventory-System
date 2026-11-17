# InventoryOS

Multi-organization, building-aware inventory management with an Odoo-style ERP interface. Built with Next.js (App Router) and TypeScript, Tailwind CSS with shadcn/ui, and TanStack Table. Supabase and Vercel arrive from Phase 2.

The build plan is in [`implementation.md`](implementation.md). The UI/UX source of truth is `InventoryOS_UI_UX_Specification_v1.0.pdf`.

## Status: Phase 1 demo build

| Phase | Scope                                            | State                                                                                                    |
| ----- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 0     | Foundation and decisions                         | ERD, invariants, ADRs and open decisions drafted in [`docs/`](docs). **Pending product-owner sign-off.** |
| 1     | ERP design system and shell (mock data)          | Done                                                                                                     |
| 2     | Supabase auth, memberships, RLS                  | Next (hosted Supabase dev project)                                                                       |
| 3–6   | Catalog, stock ledger, request workflow, reports | Not started                                                                                              |

**This build runs on fictional demo data, and nothing is persisted.** The app says so where it matters:

- A **Demo data** badge sits in the header.
- Workflow commands (Submit, Approve, Post Release…) are visible for the roles that would have them, but they're disabled and explain that they connect in Phase 5.
- Saving a draft validates it on the server with the real rules, then reports that it wasn't stored.
- Modules that aren't built yet appear in the menus as **Planned**, so they never lead to dead pages.

### What you can try

- **Overview:** role-specific work queues. Each card opens a filtered list.
- **Products:** a server-paged list with search, filters, group-by and saved views. Every one of these lives in the URL, along with sort and pagination. You can also choose columns and row density. Each product has a detail page with tabs for stock by location and movement history.
- **Requests:** a list with preset queues, a read-only record view with a stage bar, a line grid that keeps requested, approved, reserved, released and received quantities separate, approval history, fulfillment documents and an activity timeline.
- **Request drafts:** editable when the draft is yours. Validation runs on both client and server, and the form guards against leaving with unsaved changes. Start one at **Requests → New**.
- **Stock forecast:** **Reporting → Stock Forecast** shows the stock needed next month (December 2026) for every active product. It has Short / At risk / Covered tiles, a lowest-coverage chart and a filterable table with need, shortfall and suggested order. Each product's **Forecast** tab charts six months of use, November to date, and the December need against stock available now. The Overview has a **Short Next Month** card.
- **Demo role switcher:** in the user menu (top right). View the app as Org Admin, Warehouse Staff, Building Manager, Requester, Viewer, Auditor or Platform Admin, and switch between the two demo organizations.

## Stock forecast method (demo)

This is a deliberately simple, explainable heuristic. The UI/UX spec defers advanced forecasting, and the method is open decision #13 in [`docs/open-decisions.md`](docs/open-decisions.md).

1. **Forecast use** is a weighted average of the last three complete months: Aug 17%, Sep 33%, Oct 50%. It is rounded up to whole units.
2. **Already requested** is the quantity on open requests that isn't reserved yet. It comes from the demo requests.
3. **Need** = the larger of forecast use and already requested, plus the product's reorder minimum as safety stock.
4. **Shortfall** = need − available now. **Coverage** = available ÷ need.
5. **Status:** Short below 100%, At risk below 125%, Covered otherwise.

The monthly usage history is synthetic demo data (`src/features/forecasting/data/demo-usage-history.ts`). Phase 4 replaces it with issued quantities from the stock ledger. All maths runs on integer minor units, never floats.

The charts are plain HTML/CSS components in `src/components/erp/charts/`. They render on the server, include a hover/keyboard tooltip and a "View as table" twin, and their colours were checked with the dataviz palette validator.

## Getting started

Requires Node.js 24 (tested with 24.11) and npm 11.

```bash
npm install
npm run dev            # http://localhost:3000
```

Phase 1 needs no environment variables. `.env.example` lists the Supabase variables used from Phase 2. Copy it to `.env.local` and never commit real values.

## Scripts

| Script                            | Purpose                                                                                              |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Development server (Turbopack)                                                                       |
| `npm run build` / `npm start`     | Production build / server                                                                            |
| `npm run lint`                    | ESLint                                                                                               |
| `npm run typecheck`               | Route type generation and `tsc --noEmit` (strict, `noUncheckedIndexedAccess`)                        |
| `npm run test`                    | Vitest unit and component tests                                                                      |
| `npm run test:e2e`                | Playwright end-to-end and axe accessibility tests. Run `npx playwright install chromium` once first. |
| `npm run format` / `format:check` | Prettier                                                                                             |

Before merging, all of these must pass: `lint`, `typecheck`, `test`, `build` and `test:e2e`. CI runs them in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Project layout

```text
src/
  app/(erp)/inventory/      routes: overview, products, requests
  components/ui/            shadcn primitives (generated; edit sparingly)
  components/erp/           shared ERP patterns: app-shell, page-header, control-panel,
                            data-table, record-form, status-bar, smart-buttons, activity, feedback
  features/<feature>/       domain types, Zod schemas, list configs, repositories, feature UI
  lib/authorization/        roles, permission matrix, SessionContext
  lib/demo/                 Phase 1 demo session (cookies) and helpers; replaced in Phase 2
  lib/list-query/           URL-backed list state parsing
  lib/validation/           exact decimal-string quantity rules
tests/e2e/                  Playwright specs
docs/                       ADRs, ERD, invariants, open decisions
```

### Conventions worth knowing

- **Cache Components is on.** This is the Next.js 16 default. Reading request data (cookies, `searchParams`) happens inside `<Suspense>`, and reading the clock happens after `connection()`.
- **Repositories take the session.** Every read is scoped to the active organization and the user's buildings. This mirrors the RLS that Phase 2 adds. Pages never filter for authorization in the browser.
- **Quantities are decimal strings, never floats.** See `lib/validation/quantity.ts`.
- **Status labels come from one place:** `features/requests/domain/request-status.ts`.
- **Display formatting uses `en-PH` and `Asia/Manila`.** See `lib/format.ts`.
