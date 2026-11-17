import { describe, expect, it } from "vitest";

import { buildSessionContext } from "@/lib/demo/session";
import { DEMO_DATASET } from "@/features/inventory/data/demo-dataset";
import { getPersona } from "@/features/organizations/data/mock-organizations";
import { forecastListQuery } from "../forecast-list-config";
import { countShortNextMonth, getProductForecast, listForecast } from "./forecast-repository";

function session(personaId: string, orgId = "org-nbh") {
  return buildSessionContext(getPersona(personaId)!, orgId);
}

const admin = session("persona-org-admin");
const all = (orgSession = admin) =>
  listForecast(orgSession, forecastListQuery.parse({ size: "200" }));

describe("forecast repository", () => {
  it("covers active products of the active organization only", () => {
    const result = all();
    const activeNbh = DEMO_DATASET.products.filter(
      (p) => p.organizationId === "org-nbh" && p.isActive,
    );
    expect(result.total).toBe(activeNbh.length);
    const lmgIds = new Set(all(session("persona-org-admin", "org-lmg")).rows.map((row) => row.id));
    expect(result.rows.some((row) => lmgIds.has(row.id))).toBe(false);
  });

  it("returns nothing to roles without stock visibility", () => {
    const requester = session("persona-requester");
    expect(listForecast(requester, forecastListQuery.parse({})).total).toBe(0);
    expect(countShortNextMonth(requester)).toBe(0);
    expect(getProductForecast(requester, all().rows[0]!.id)).toBeNull();
  });

  it("produces a realistic mix of statuses whose counts add up", () => {
    const { summary } = all();
    expect(summary.short + summary.at_risk + summary.covered).toBe(summary.total);
    expect(summary.short).toBeGreaterThan(5);
    expect(summary.covered).toBeGreaterThan(summary.short);
    expect(countShortNextMonth(admin)).toBe(summary.short);
  });

  it("filters by status consistently with coverage", () => {
    const short = listForecast(admin, forecastListQuery.parse({ filter: "short", size: "200" }));
    expect(short.rows.every((row) => row.coveragePct < 100)).toBe(true);
    expect(short.summary).toMatchObject({ short: short.total, at_risk: 0, covered: 0 });
  });

  it("sorts by coverage ascending by default and lists the lowest coverage first", () => {
    const result = all();
    for (let index = 1; index < result.rows.length; index++) {
      expect(result.rows[index - 1]!.coveragePct).toBeLessThanOrEqual(
        result.rows[index]!.coveragePct,
      );
    }
    expect(result.lowestCoverage).toHaveLength(10);
    expect(result.lowestCoverage[0]!.coveragePct).toBe(result.rows[0]!.coveragePct);
  });

  it("derives pending demand from open, unreserved request lines", () => {
    const request = DEMO_DATASET.requests.find(
      (item) => item.organizationId === "org-nbh" && item.status === "submitted",
    )!;
    const line = request.lines[0]!;
    const forecast = getProductForecast(admin, line.productId);
    expect(forecast).not.toBeNull();
    expect(Number(forecast!.row.pending)).toBeGreaterThanOrEqual(Number(line.requested));
  });

  it("returns six complete months, the month to date and need = expected use + safety stock", () => {
    const forecast = getProductForecast(admin, all().rows[0]!.id)!;
    expect(forecast.history.map((point) => point.key)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(forecast.history.at(-1)?.partial).toBe(true);
    const { row } = forecast;
    expect(Number(row.need)).toBeCloseTo(Number(row.expectedUse) + Number(row.minimum), 6);
  });
});
