import { describe, expect, it } from "vitest";

import {
  compareDecimal,
  isNegativeDecimal,
  subtractDecimal,
  sumDecimals,
} from "@/lib/validation/quantity";
import { STOCK_LOCATIONS } from "@/features/organizations/data/mock-organizations";
import { DEMO_DATASET } from "./demo-dataset";

const lte = (a: string, b: string) => compareDecimal(a, b) <= 0;

describe("demo dataset invariants (docs/domain/inventory-invariants.md)", () => {
  it("is deterministic in size", () => {
    expect(DEMO_DATASET.requests).toHaveLength(300);
    expect(DEMO_DATASET.products.length).toBeGreaterThan(300);
  });

  it("keeps request line quantities ordered: received ≤ released ≤ approved ≤ requested (R1–R3)", () => {
    for (const request of DEMO_DATASET.requests) {
      for (const line of request.lines) {
        const approved = line.approved ?? "0";
        if (line.approved !== null) expect(lte(line.approved, line.requested)).toBe(true);
        expect(lte(line.received, line.released)).toBe(true);
        expect(lte(sumDecimals([line.reserved, line.released]), approved)).toBe(true);
      }
    }
  });

  it("only approved-or-later requests carry approved quantities", () => {
    const preApproval = new Set([
      "draft",
      "submitted",
      "under_review",
      "changes_requested",
      "rejected",
      "cancelled",
    ]);
    for (const request of DEMO_DATASET.requests) {
      for (const line of request.lines) {
        if (preApproval.has(request.status)) {
          expect(line.approved).toBeNull();
          expect(line.reserved).toBe("0");
          expect(line.released).toBe("0");
        } else {
          expect(line.approved).not.toBeNull();
        }
      }
    }
  });

  it("matches the stage invariants for each status", () => {
    for (const request of DEMO_DATASET.requests) {
      const lines = request.lines;
      switch (request.status) {
        case "ready_for_release":
          lines.forEach((line) => expect(line.reserved).toBe(line.approved));
          break;
        case "waiting_stock":
          expect(
            lines.some((line) => compareDecimal(line.reserved, line.approved ?? "0") < 0),
          ).toBe(true);
          break;
        case "in_transit":
          lines.forEach((line) => {
            expect(line.released).toBe(line.approved);
            expect(line.received).toBe("0");
          });
          break;
        case "partially_received":
          expect(lines.some((line) => compareDecimal(line.received, line.released) < 0)).toBe(true);
          break;
        case "completed":
          lines.forEach((line) => expect(line.released).toBe(line.approved));
          break;
      }
    }
  });

  it("never has negative availability at internal locations (L5)", () => {
    const internal = new Set(STOCK_LOCATIONS.filter((l) => l.type === "internal").map((l) => l.id));
    for (const product of DEMO_DATASET.products) {
      for (const balance of product.balances) {
        if (!internal.has(balance.locationId)) continue;
        expect(isNegativeDecimal(subtractDecimal(balance.onHand, balance.reserved))).toBe(false);
      }
    }
  });

  it("derives reserved balances from active reservations on request lines", () => {
    const reservedByProduct = new Map<string, string[]>();
    for (const request of DEMO_DATASET.requests) {
      if (request.status !== "waiting_stock" && request.status !== "ready_for_release") continue;
      for (const line of request.lines) {
        reservedByProduct.set(line.productId, [
          ...(reservedByProduct.get(line.productId) ?? []),
          line.reserved,
        ]);
      }
    }
    for (const product of DEMO_DATASET.products) {
      const expected = sumDecimals(reservedByProduct.get(product.id) ?? []);
      const actual = sumDecimals(product.balances.map((balance) => balance.reserved));
      expect(compareDecimal(actual, expected)).toBe(0);
    }
  });

  it("assigns unique per-organization request references", () => {
    for (const orgId of ["org-nbh", "org-lmg"]) {
      const refs = DEMO_DATASET.requests
        .filter((r) => r.organizationId === orgId)
        .map((r) => r.reference);
      expect(new Set(refs).size).toBe(refs.length);
    }
  });

  it("only uses each organization's own products on its requests", () => {
    const productOrg = new Map(
      DEMO_DATASET.products.map((product) => [product.id, product.organizationId]),
    );
    for (const request of DEMO_DATASET.requests) {
      for (const line of request.lines)
        expect(productOrg.get(line.productId)).toBe(request.organizationId);
    }
  });
});
