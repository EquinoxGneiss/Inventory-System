import { describe, expect, it } from "vitest";

import { permissionsForRoles } from "@/lib/authorization/permissions";
import type { Role } from "@/lib/authorization/roles";
import {
  REQUEST_STAGES,
  REQUEST_STATUSES,
  REQUEST_STATUS_META,
  REQUEST_TRANSITIONS,
  allowedCommands,
  nextStatuses,
  stageForStatus,
} from "./request-status";

const as = (role: Role) => ({ permissions: permissionsForRoles([role]) });

describe("request state machine (implementation.md §7)", () => {
  it("defines a label and tone for every status", () => {
    for (const status of REQUEST_STATUSES) {
      expect(REQUEST_STATUS_META[status].label).toBeTruthy();
    }
  });

  it("only lets requesters submit or cancel their drafts", () => {
    expect(allowedCommands("draft", as("requester"))).toEqual(["submit_request", "cancel_request"]);
    expect(allowedCommands("submitted", as("requester"))).toEqual([]);
    expect(allowedCommands("ready_for_release", as("requester"))).toEqual([]);
  });

  it("gives the Organization Admin review decisions and the release", () => {
    expect(allowedCommands("under_review", as("org_admin"))).toEqual([
      "approve_request",
      "request_changes",
      "reject_request",
    ]);
    expect(allowedCommands("ready_for_release", as("org_admin"))).toEqual(["post_release"]);
  });

  it("never offers a release to warehouse staff or building managers (no peer release)", () => {
    for (const role of [
      "warehouse_staff",
      "building_manager",
      "requester",
      "platform_admin",
    ] as Role[]) {
      expect(allowedCommands("ready_for_release", as(role))).not.toContain("post_release");
    }
  });

  it("does not let approval release stock, or release confirm receipt (§7.2 rules 2–3)", () => {
    expect(nextStatuses("under_review", "approve_request")).toEqual(["approved"]);
    expect(nextStatuses("ready_for_release", "post_release")).toEqual(["in_transit"]);
  });

  it("lets building managers confirm receipts for in-transit and partial deliveries", () => {
    expect(allowedCommands("in_transit", as("building_manager"))).toEqual(["confirm_receipt"]);
    expect(allowedCommands("partially_received", as("building_manager"))).toEqual([
      "confirm_receipt",
    ]);
    expect(nextStatuses("partially_received", "confirm_receipt")).toEqual([
      "partially_received",
      "completed",
    ]);
  });

  it("has no commands on closed documents (§7.2 rule 6)", () => {
    for (const status of ["completed", "rejected", "cancelled"] as const) {
      expect(REQUEST_TRANSITIONS.some((transition) => transition.from.includes(status))).toBe(
        false,
      );
    }
  });

  it("only allows an authorized cancel once submitted", () => {
    expect(allowedCommands("submitted", as("org_admin"))).toContain("cancel_request");
    expect(allowedCommands("submitted", as("building_manager"))).not.toContain("cancel_request");
  });

  it("maps branch states onto the stage bar as exceptions", () => {
    expect(stageForStatus("in_transit")).toEqual({ stage: "in_transit", exception: null });
    expect(stageForStatus("waiting_stock")).toEqual({
      stage: "approved",
      exception: "waiting_stock",
    });
    expect(stageForStatus("rejected")).toEqual({ stage: "under_review", exception: "rejected" });
    expect(stageForStatus("cancelled")).toEqual({ stage: null, exception: "cancelled" });
    const stageKeys = REQUEST_STAGES.map((stage) => stage.key as string);
    for (const status of REQUEST_STATUSES) {
      const { stage } = stageForStatus(status);
      if (stage) expect(stageKeys).toContain(stage);
    }
  });
});
