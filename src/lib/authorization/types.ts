import type { Permission } from "./permissions";
import type { Role } from "./roles";

export interface OrganizationSummary {
  id: string;
  code: string;
  name: string;
}

export interface SessionUser {
  id: string;
  displayName: string;
  initials: string;
  /** Short description of who this is (job title). */
  title: string;
}

export interface ActiveMembership {
  role: Role;
  /** `null` for organization-wide roles. */
  buildingId: string | null;
}

/**
 * Everything a page or server action needs to know about the current actor in
 * the active organization. Phase 1 builds this from demo cookies
 * (`lib/demo/session.ts`); Phase 2 builds it from verified Supabase claims and
 * the `memberships` table. Pages depend only on this shape.
 */
export interface SessionContext {
  user: SessionUser;
  organization: OrganizationSummary;
  /** Organizations the user holds an active membership in. */
  organizations: OrganizationSummary[];
  memberships: ActiveMembership[];
  permissions: Permission[];
  /**
   * Buildings whose documents this user may see. `null` means every building
   * in the organization (an organization-wide role is present).
   */
  buildingScope: string[] | null;
  /** True while running on built-in demo data (Phase 1). */
  isDemo: boolean;
}

export function canAccessBuilding(session: SessionContext, buildingId: string): boolean {
  return session.buildingScope === null || session.buildingScope.includes(buildingId);
}
