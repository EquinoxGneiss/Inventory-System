import type { Role } from "./roles";

/**
 * Permission keys used by navigation, actions and (from Phase 2) server
 * authorization helpers. The database RPCs repeat the same rules — UI checks
 * here are a usability aid, never the security boundary (ADR 0002).
 */
export const PERMISSIONS = [
  "products:read",
  "stock:read",
  "requests:read",
  "requests:create",
  "requests:approve",
  "releases:prepare",
  "releases:post",
  "receipts:confirm",
  "adjustments:post",
  "audit:read",
  "config:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Role → permission matrix (implementation.md §6.3, UI/UX spec §7.2), using the
 * conservative defaults from docs/open-decisions.md:
 * - Warehouse staff do not create requests ("by policy" → off by default).
 * - "Confirm receipt if assigned" (org admin, warehouse staff, requester) needs a
 *   per-document receiver designation that arrives in Phase 5; until then only
 *   building managers hold `receipts:confirm`.
 * - Requesters have "limited" stock visibility: no `stock:read`, so on-hand and
 *   reserved quantities are withheld server-side.
 * - Platform administrators hold no inventory permissions at all.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  platform_admin: ["config:manage"],
  org_admin: [
    "products:read",
    "stock:read",
    "requests:read",
    "requests:create",
    "requests:approve",
    "releases:prepare",
    "releases:post",
    "adjustments:post",
    "audit:read",
    "config:manage",
  ],
  warehouse_staff: [
    "products:read",
    "stock:read",
    "requests:read",
    "releases:prepare",
    "audit:read",
  ],
  building_manager: [
    "products:read",
    "stock:read",
    "requests:read",
    "requests:create",
    "receipts:confirm",
    "audit:read",
  ],
  requester: ["products:read", "requests:read", "requests:create"],
  viewer: ["products:read", "stock:read", "requests:read"],
  auditor: ["products:read", "stock:read", "requests:read", "audit:read"],
};

export function permissionsForRoles(roles: Iterable<Role>): Permission[] {
  const granted = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) granted.add(permission);
  }
  // Keep a stable order so the list can be serialized and compared.
  return PERMISSIONS.filter((permission) => granted.has(permission));
}

export interface PermissionHolder {
  readonly permissions: readonly Permission[];
}

export function hasPermission(holder: PermissionHolder, permission: Permission): boolean {
  return holder.permissions.includes(permission);
}

export function hasAnyPermission(
  holder: PermissionHolder,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => holder.permissions.includes(permission));
}
