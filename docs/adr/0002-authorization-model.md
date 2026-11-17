# ADR 0002 — Scoped role memberships enforced at three layers

- **Status:** Proposed (pending product-owner sign-off)
- **Date:** 2026-11-18
- **Applies from:** Phase 2. Phase 1 uses a demo session with the same shape; see `src/lib/demo/session.ts`.

## Context

Users can belong to several organizations and hold different roles in each. Building-level users (building managers and requesters) may see only their assigned buildings. Separation of duties is a business rule: only an Organization Admin may approve requests, post releases or post adjustments. A platform administrator must **not** inherit stock powers.

## Decision

1. **Identity versus permission.** Supabase Auth provides identity only. Permissions come from `memberships(user_id, organization_id, building_id NULLABLE, role, is_active)`.
2. **Roles map to permissions in one place.** The role → permission matrix lives in `src/lib/authorization/permissions.ts`, which mirrors §6.3 of `implementation.md`. The database functions repeat the same rules. Tests pin both.
3. **Three enforcement layers:**
   1. **UI.** Menus and actions hide or disable themselves through `hasPermission`. This is a usability aid only.
   2. **Server.** Every Server Action and Route Handler:
      - re-resolves the verified identity (`auth.getClaims()`, never `getSession()`),
      - loads memberships,
      - re-checks permission and record scope, and
      - never trusts organization IDs, roles or approver fields sent from the browser.
   3. **Database.**
      - RLS limits reads and writes by `auth.uid()` and active memberships.
      - Privileged transitions (`approve_request`, `post_release`, …) are narrow RPCs that run their own actor and membership checks.
      - `EXECUTE` is revoked from `public` and `anon`.
      - `SECURITY DEFINER` functions pin `search_path`.
4. **Scope rules.**
   - Organization-wide roles (`org_admin`, `warehouse_staff`, `viewer`, `auditor`) have `building_id IS NULL`.
   - Building-scoped roles (`building_manager`, `requester`) must name a building.
   - Every query filters by the active organization **and**, where relevant, by the user's assigned buildings.
5. **`platform_admin` gets no stock permissions.** Org administration and stock governance are separate grants.

## Consequences

- Authorization logic exists both in TypeScript and in SQL. That duplication is intentional defence in depth, and permission tests cover both.
- Phase 1's demo session gives pages the same `SessionContext` shape that Phase 2 will produce, so pages don't change when real authentication arrives.
- Role-abuse tests are a release blocker. They cover direct RPC calls by requesters, release posting by warehouse staff, cross-organization reads and revoked memberships.
