import { describe, expect, it } from "vitest";

import { hasPermission, permissionsForRoles, ROLE_PERMISSIONS } from "./permissions";
import { ROLES, type Role } from "./roles";

const holder = (...roles: Role[]) => ({ permissions: permissionsForRoles(roles) });

describe("permission matrix (implementation.md §6.3)", () => {
  it("lets every inventory role view scoped products", () => {
    for (const role of ROLES.filter((item) => item !== "platform_admin")) {
      expect(hasPermission(holder(role), "products:read"), role).toBe(true);
    }
  });

  it("makes the Organization Admin the only approver, releaser and adjuster", () => {
    for (const role of ROLES) {
      const expected = role === "org_admin";
      expect(hasPermission(holder(role), "requests:approve"), role).toBe(expected);
      expect(hasPermission(holder(role), "releases:post"), role).toBe(expected);
      expect(hasPermission(holder(role), "adjustments:post"), role).toBe(expected);
    }
  });

  it("gives platform administrators no inventory powers", () => {
    const platform = holder("platform_admin");
    expect(platform.permissions).toEqual(["config:manage"]);
    expect(hasPermission(platform, "products:read")).toBe(false);
    expect(hasPermission(platform, "requests:approve")).toBe(false);
  });

  it("lets warehouse staff prepare but not post releases", () => {
    const staff = holder("warehouse_staff");
    expect(hasPermission(staff, "releases:prepare")).toBe(true);
    expect(hasPermission(staff, "releases:post")).toBe(false);
    expect(hasPermission(staff, "requests:create")).toBe(false);
  });

  it("lets requesters and building managers create requests, but not viewers or auditors", () => {
    expect(hasPermission(holder("requester"), "requests:create")).toBe(true);
    expect(hasPermission(holder("building_manager"), "requests:create")).toBe(true);
    expect(hasPermission(holder("viewer"), "requests:create")).toBe(false);
    expect(hasPermission(holder("auditor"), "requests:create")).toBe(false);
  });

  it("withholds stock quantities from requesters (limited visibility)", () => {
    expect(hasPermission(holder("requester"), "stock:read")).toBe(false);
    expect(hasPermission(holder("viewer"), "stock:read")).toBe(true);
  });

  it("reserves receipt confirmation for building managers until receiver designation exists", () => {
    const confirmers = ROLES.filter((role) => ROLE_PERMISSIONS[role].includes("receipts:confirm"));
    expect(confirmers).toEqual(["building_manager"]);
  });

  it("merges permissions across roles without duplicates, in a stable order", () => {
    const merged = permissionsForRoles(["viewer", "auditor", "viewer"]);
    expect(merged).toEqual(["products:read", "stock:read", "requests:read", "audit:read"]);
  });
});
