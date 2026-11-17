/**
 * Role catalog (implementation.md §6.1, UI/UX spec §7.1).
 * Roles are always granted per organization (and per building for
 * building-scoped roles) through memberships — never globally.
 */
export const ROLES = [
  "platform_admin",
  "org_admin",
  "warehouse_staff",
  "building_manager",
  "requester",
  "viewer",
  "auditor",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  platform_admin: "Platform Administrator",
  org_admin: "Organization Admin",
  warehouse_staff: "Warehouse Staff",
  building_manager: "Building Manager",
  requester: "Requester",
  viewer: "Viewer",
  auditor: "Auditor",
};

/** Roles that must be tied to a specific building in their membership. */
export const BUILDING_SCOPED_ROLES: ReadonlySet<Role> = new Set<Role>([
  "building_manager",
  "requester",
]);

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
