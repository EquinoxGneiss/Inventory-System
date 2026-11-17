import type { Page } from "@playwright/test";

export const PERSONA_COOKIE = "inventoryos_demo_persona";
export const ORG_COOKIE = "inventoryos_demo_org";

/** Same origin as playwright.config.ts. */
export const BASE_URL = `http://localhost:${process.env.PORT ?? 3100}`;

export type Persona =
  | "persona-org-admin"
  | "persona-warehouse"
  | "persona-building-manager"
  | "persona-requester"
  | "persona-viewer"
  | "persona-auditor"
  | "persona-platform-admin";

/** Act as a demo persona (and optionally organization) for the rest of the test. */
export async function actAs(page: Page, persona: Persona, organizationId?: string) {
  const cookies: Array<{ name: string; value: string; url: string }> = [
    { name: PERSONA_COOKIE, value: persona, url: BASE_URL },
  ];
  if (organizationId) cookies.push({ name: ORG_COOKIE, value: organizationId, url: BASE_URL });
  await page.context().addCookies(cookies);
}

/** Navigate and wait until the client has hydrated and settled. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
