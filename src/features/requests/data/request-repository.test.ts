import { describe, expect, it } from "vitest";

import { buildSessionContext } from "@/lib/demo/session";
import { getPersona } from "@/features/organizations/data/mock-organizations";
import { DEMO_DATASET } from "@/features/inventory/data/demo-dataset";
import { requestListQuery } from "../request-list-config";
import {
  countRequestQueues,
  getRequest,
  listRequests,
  requestableBuildings,
} from "./request-repository";

function session(personaId: string, orgId = "org-nbh") {
  const persona = getPersona(personaId);
  if (!persona) throw new Error(personaId);
  return buildSessionContext(persona, orgId);
}

const admin = session("persona-org-admin");
const requester = session("persona-requester");
const manager = session("persona-building-manager");
const platform = session("persona-platform-admin");

describe("request repository scoping (mirrors planned RLS)", () => {
  it("never returns another organization's requests", () => {
    const result = listRequests(admin, requestListQuery.parse({ size: "200" }));
    expect(result.total).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(DEMO_DATASET.requests.find((request) => request.id === row.id)?.organizationId).toBe(
        "org-nbh",
      );
    }
    const lmgRequest = DEMO_DATASET.requests.find(
      (request) => request.organizationId === "org-lmg",
    )!;
    expect(getRequest(admin, lmgRequest.id)).toBeNull();
  });

  it("limits building-scoped users to their assigned building", () => {
    const result = listRequests(requester, requestListQuery.parse({ size: "200" }));
    expect(result.rows.every((row) => row.buildingId === "bld-nbh-hq")).toBe(true);
    const otherBuilding = DEMO_DATASET.requests.find(
      (request) => request.organizationId === "org-nbh" && request.buildingId !== "bld-nbh-hq",
    )!;
    expect(getRequest(requester, otherBuilding.id)).toBeNull();
  });

  it("keeps drafts private to the requester and the building manager", () => {
    const drafts = DEMO_DATASET.requests.filter(
      (request) => request.organizationId === "org-nbh" && request.status === "draft",
    );
    expect(drafts.length).toBeGreaterThan(0);
    for (const draft of drafts) {
      expect(getRequest(admin, draft.id)).toBeNull();
      const visibleToRequester = getRequest(requester, draft.id) !== null;
      expect(visibleToRequester).toBe(draft.requesterId === "persona-requester");
      expect(getRequest(manager, draft.id) !== null).toBe(draft.buildingId === "bld-nbh-hq");
    }
  });

  it("filters My Requests to the current user", () => {
    const mine = listRequests(requester, requestListQuery.parse({ filter: "mine", size: "200" }));
    expect(mine.total).toBeGreaterThan(0);
    expect(mine.rows.every((row) => row.requesterName === "Miguel Tan")).toBe(true);
  });

  it("combines stage filters with OR and returns stable totals per queue", () => {
    const counts = countRequestQueues(admin);
    const both = listRequests(
      admin,
      requestListQuery.parse({ filter: "pending_approval,ready_for_release" }),
    );
    expect(both.total).toBe(counts.pending_approval + counts.ready_for_release);
  });

  it("returns per-group totals across all pages when grouping", () => {
    const grouped = listRequests(admin, requestListQuery.parse({ group: "status", size: "25" }));
    const sum = Object.values(grouped.groupCounts ?? {}).reduce((total, count) => total + count, 0);
    expect(sum).toBe(grouped.total);
    expect(grouped.rows).toHaveLength(25);
  });

  it("returns nothing to roles without request access", () => {
    expect(listRequests(platform, requestListQuery.parse({})).total).toBe(0);
    expect(requestableBuildings(platform)).toEqual([]);
  });

  it("lets building-scoped users request only for their buildings", () => {
    expect(requestableBuildings(requester).map((building) => building.id)).toEqual(["bld-nbh-hq"]);
    expect(requestableBuildings(admin)).toHaveLength(4);
  });
});
