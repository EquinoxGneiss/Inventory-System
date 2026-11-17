# Inventory invariants

**Status: Proposed.** These are the written invariants for the Phase 0 exit gate. Every later phase must keep them true, and the tests named here enforce them as each phase lands.

## Quantity concepts

| Concept        | Definition                                                            | Where it lives                                                 |
| -------------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| **On hand**    | Posted stock physically at a location                                 | `stock_balances.on_hand` (projection of the ledger)            |
| **Reserved**   | Unfulfilled allocation against approved request lines                 | `stock_reservations` (active), summed per location and product |
| **Available**  | `on_hand − reserved`                                                  | Derived; never stored as an editable value                     |
| **In transit** | Stock released from a source but not yet confirmed at its destination | On-hand balance of a `transit`-type location                   |
| **Received**   | Stock confirmed at its destination                                    | Ledger legs from transit to the destination location           |

Example: 100 on hand with 25 reserved gives 75 available. Approving a request creates **no** movement.

## Ledger invariants

1. **L1 Append-only.** Ledger entries are never updated or deleted. Corrections are linked compensating entries.
2. **L2 Balanced.** Each posted operation line writes legs that sum to zero across locations. Virtual locations, such as supplier or adjustment locations, absorb the external side.
3. **L3 Atomic.** Ledger append, balance update, reservation change, document state, audit event and idempotency record all commit together or not at all.
4. **L4 Reconciled.** For every location and product, `on_hand = Σ ledger.quantity`. A drift alert fires otherwise.
5. **L5 Non-negative availability.** `available ≥ 0` at every physical location after each posting, unless an explicitly approved exception policy exists (none in v1).
6. **L6 Idempotent.** Replaying a command with the same organization-scoped `idempotency_key` returns the first result and appends nothing.

## Request line invariants

For every request line, at all times:

```
0 ≤ received ≤ released ≤ reserved_or_released ≤ approved ≤ requested
```

- **R1** `approved ≤ requested`. Approving fewer than requested is allowed; approving more is not.
- **R2** Reserved plus released never exceeds approved.
- **R3** Cumulative received never exceeds released (§7.2 rule 4).
- **R4** Line quantities are positive decimals within the unit of measure's precision (no floats).
- **R5** A request has at least one line before submission.

## Workflow invariants (non-negotiable, §7.2)

1. **W1** A building cannot issue inventory directly to a peer building in v1.
2. **W2** Approval does **not** release stock.
3. **W3** Release does **not** confirm receipt.
4. **W4** A partial receipt cannot exceed the remaining released quantity.
5. **W5** Edits to approved quantities are audited and revalidated. A stale approval cannot silently apply to a changed request (enforced through `expectedVersion`).
6. **W6** Completed or posted documents are read-only. Only linked follow-up postings correct them.
7. **W7** Every command is safe under concurrency, retries and abandoned sessions.

## Authorization invariants

- **A1** Only an `org_admin` of the record's organization may approve or reject requests, post releases or post adjustments.
- **A2** `platform_admin` holds no stock permissions.
- **A3** Building-scoped users see and act only on their assigned buildings' documents.
- **A4** Every server mutation re-checks identity, membership and record state. UI visibility is never authorization.

## Where they are enforced

| Invariant | Phase 1 (mock)                                                        | Later enforcement                                 |
| --------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| R1–R4     | Mock generator produces consistent lines; draft schema enforces R4/R5 | DB `CHECK` constraints + posting RPCs (Phase 4–5) |
| W1–W7     | State machine exposes only valid commands (`request-status.ts`)       | RPCs + `expectedVersion` + idempotency (Phase 5)  |
| A1–A4     | `permissions.ts` matrix + unit tests; repository scoping              | RLS + RPC checks + role-abuse tests (Phase 2)     |
| L1–L6     | n/a                                                                   | Ledger schema, grants, pgTAP tests (Phase 4)      |
