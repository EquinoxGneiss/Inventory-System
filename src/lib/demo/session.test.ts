import { describe, expect, it } from "vitest";

import { getPersona } from "@/features/organizations/data/mock-organizations";
import { buildSessionContext } from "./session";

describe("demo session context", () => {
  it("gives organization-wide roles every building", () => {
    const context = buildSessionContext(getPersona("persona-org-admin")!, "org-lmg");
    expect(context.organization.id).toBe("org-lmg");
    expect(context.buildingScope).toBeNull();
    expect(context.permissions).toContain("requests:approve");
  });

  it("scopes building roles to their assigned building in the active organization", () => {
    const context = buildSessionContext(getPersona("persona-requester")!, "org-lmg");
    expect(context.buildingScope).toEqual(["bld-lmg-mhw"]);
  });

  it("ignores an organization the persona has no membership in", () => {
    const context = buildSessionContext(getPersona("persona-viewer")!, "org-lmg");
    expect(context.organization.id).toBe("org-nbh");
    expect(context.organizations.map((org) => org.id)).toEqual(["org-nbh"]);
  });

  it("marks the session as demo data", () => {
    expect(buildSessionContext(getPersona("persona-auditor")!).isDemo).toBe(true);
  });
});
