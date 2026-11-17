"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { getPersona } from "@/features/organizations/data/mock-organizations";
import { DEMO_ORG_COOKIE, DEMO_PERSONA_COOKIE } from "./constants";
import { getSessionContext } from "./session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;

export type DemoContextResult = { ok: true } | { ok: false; message: string };

const idSchema = z.string().min(1).max(64);

/**
 * Switch the active organization. The target must be one of the current
 * persona's memberships — the browser-supplied id is never trusted alone.
 */
export async function switchOrganization(organizationId: unknown): Promise<DemoContextResult> {
  const parsed = idSchema.safeParse(organizationId);
  if (!parsed.success) return { ok: false, message: "Unknown organization." };
  const session = await getSessionContext();
  if (!session.organizations.some((org) => org.id === parsed.data)) {
    return { ok: false, message: "You don't have access to that organization." };
  }
  (await cookies()).set(DEMO_ORG_COOKIE, parsed.data, COOKIE_OPTIONS);
  return { ok: true };
}

/** Demo-only: impersonate one of the fixed demo personas. */
export async function switchPersona(personaId: unknown): Promise<DemoContextResult> {
  const parsed = idSchema.safeParse(personaId);
  const persona = parsed.success ? getPersona(parsed.data) : undefined;
  if (!persona) return { ok: false, message: "Unknown demo role." };
  const store = await cookies();
  store.set(DEMO_PERSONA_COOKIE, persona.id, COOKIE_OPTIONS);
  // Keep the active organization if the new persona belongs to it.
  const currentOrg = store.get(DEMO_ORG_COOKIE)?.value;
  if (!persona.memberships.some((membership) => membership.organizationId === currentOrg)) {
    store.delete(DEMO_ORG_COOKIE);
  }
  return { ok: true };
}
