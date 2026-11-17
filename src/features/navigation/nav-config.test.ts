import { describe, expect, it } from "vitest";

import { permissionsForRoles } from "@/lib/authorization/permissions";
import type { Role } from "@/lib/authorization/roles";
import { visibleNavigation } from "./nav-config";

const nav = (role: Role) => visibleNavigation({ permissions: permissionsForRoles([role]) });

describe("permission-based navigation", () => {
  it("shows every module to the Organization Admin", () => {
    expect(nav("org_admin").map((module) => module.key)).toEqual([
      "overview",
      "operations",
      "requests",
      "products",
      "reporting",
      "configuration",
    ]);
  });

  it("hides configuration and approvals from requesters", () => {
    const modules = nav("requester");
    expect(modules.map((module) => module.key)).not.toContain("configuration");
    const requests = modules.find((module) => module.key === "requests")!;
    expect(requests.items.map((item) => item.label)).not.toContain("Approval Center");
    expect(requests.items.map((item) => item.label)).toContain("My Requests");
  });

  it("shows platform administrators only overview and configuration", () => {
    expect(nav("platform_admin").map((module) => module.key)).toEqual([
      "overview",
      "configuration",
    ]);
  });

  it("never gives planned items a link", () => {
    for (const navModule of nav("org_admin")) {
      for (const item of navModule.items) {
        if (item.status === "planned") expect(item.href).toBeNull();
        else expect(item.href).toMatch(/^\/inventory\//);
      }
    }
  });
});
