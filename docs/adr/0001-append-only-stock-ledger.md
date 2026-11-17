# ADR 0001 — Append-only stock ledger with transactional balance projections

- **Status:** Proposed (pending product-owner sign-off; see [open decisions](../open-decisions.md))
- **Date:** 2026-11-18
- **Applies from:** Phase 4 (stock accounting engine). Phase 1 only renders mock balances.

## Context

InventoryOS must show exact on-hand, reserved, available and in-transit quantities for several organizations, buildings and locations. Many users act at once, and networks retry. Any of these can corrupt a mutable `quantity` column: lost updates, double posting, or partial commits. Auditors also need to trace every quantity back to a source document and an actor.

## Decision

1. **The ledger is the source of truth.** `stock_ledger_entries` is append-only. Each posted operation writes balanced, signed legs. For example, a release writes `-5` at the origin and `+5` at the transit location. No `UPDATE` or `DELETE` is ever granted on ledger rows.
2. **Balances are projections.** `stock_balances` (on hand by organization, location and product) and `stock_reservations` change **only** inside the same PostgreSQL transaction that appends to the ledger. Clients never write these tables directly.
3. **Every posting is one database function call (RPC).** Each function runs these steps in order:
   1. Authorize the actor against the record's organization, building and location.
   2. Check the document's state and expected version.
   3. Lock the balance rows in deterministic order with `SELECT … FOR UPDATE`.
   4. Validate availability.
   5. Append the ledger entries and update the projections.
   6. Record the audit event and the idempotency result.

   Then it commits, or rolls back everything. A posting is never split across several client requests.

4. **Idempotency.** Each high-risk command carries a client-generated `idempotency_key`, unique per organization and command scope. Replaying a key returns the original result and writes nothing new.
5. **Corrections are compensating postings.** Posted operations are read-only. Reversals and adjustments create new, linked ledger entries.
6. **Quantities are `numeric`, never floats.** Precision comes from each product's base unit of measure. In TypeScript, quantities move between layers as decimal strings.
7. **Reconciliation.** A scheduled consistency check compares `sum(ledger)` with `stock_balances` and alerts on any drift.

## Consequences

- Correctness doesn't depend on UI behaviour, and concurrent releases cannot oversell.
- Posting logic lives in SQL, so the SQL needs its own tests: concurrency, rollback, role abuse and idempotency (pgTAP or SQL tests against the hosted dev project).
- Reports can read the balance projections cheaply. Movement history reads the ledger.
- Changing a unit of measure on a product that already has postings needs a controlled conversion, never an in-place edit.
