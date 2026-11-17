import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { permissionsForRoles } from "@/lib/authorization/permissions";
import type { SessionContext } from "@/lib/authorization/types";
import {
  DEFAULT_PERSONA_ID,
  getOrganization,
  getPersona,
} from "@/features/organizations/data/mock-organizations";
import type { DemoPersona } from "@/features/organizations/types";
import { DEMO_ORG_COOKIE, DEMO_PERSONA_COOKIE } from "./constants";

/**
 * Phase 1 stand-in for authentication. The persona and active organization
 * come from cookies set by the demo switchers. Phase 2 replaces this module
 * with a Supabase-backed implementation that returns the same SessionContext
 * (verified claims + memberships); callers don't change.
 */
export function buildSessionContext(persona: DemoPersona, requestedOrgId?: string): SessionContext {
  const organizations = persona.memberships
    .map((membership) => getOrganization(membership.organizationId))
    .filter(
      (org, index, list): org is NonNullable<typeof org> => !!org && list.indexOf(org) === index,
    );
  const organization = organizations.find((org) => org.id === requestedOrgId) ?? organizations[0];
  if (!organization) {
    throw new Error(`Demo persona ${persona.id} has no organization membership`);
  }
  const memberships = persona.memberships
    .filter((membership) => membership.organizationId === organization.id)
    .map(({ role, buildingId }) => ({ role, buildingId }));
  const hasOrgWideRole = memberships.some((membership) => membership.buildingId === null);
  return {
    user: {
      id: persona.id,
      displayName: persona.displayName,
      initials: persona.initials,
      title: persona.title,
    },
    organization,
    organizations,
    memberships,
    permissions: permissionsForRoles(memberships.map((membership) => membership.role)),
    buildingScope: hasOrgWideRole
      ? null
      : memberships.flatMap((membership) => (membership.buildingId ? [membership.buildingId] : [])),
    isDemo: true,
  };
}

/** Resolve the current session once per request. Reads cookies (request-time data). */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const store = await cookies();
  const persona =
    getPersona(store.get(DEMO_PERSONA_COOKIE)?.value ?? "") ?? getPersona(DEFAULT_PERSONA_ID);
  if (!persona) throw new Error("Default demo persona is missing");
  return buildSessionContext(persona, store.get(DEMO_ORG_COOKIE)?.value);
});
