import { describe, expect, it } from "vitest";

import { DEMO_DATASET } from "@/features/inventory/data/demo-dataset";
import { USAGE_MONTHS, usageHistory } from "./demo-usage-history";

describe("demo usage history", () => {
  it("covers Dec 2025 – Nov 2026 with November as the partial month", () => {
    expect(USAGE_MONTHS.map((month) => month.key)).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(USAGE_MONTHS.filter((month) => month.partial).map((month) => month.key)).toEqual([
      "2026-11",
    ]);
  });

  it("is non-negative, whole-unit and zero for archived products", () => {
    for (const product of DEMO_DATASET.products) {
      const history = usageHistory(product.id);
      expect(history).toHaveLength(12);
      const step = 10 ** product.uom.precision;
      for (const value of history) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value % step).toBe(0);
      }
      if (!product.isActive) expect(history.every((value) => value === 0)).toBe(true);
    }
  });

  it("shows November to date below a typical full month", () => {
    let partialLower = 0;
    let active = 0;
    for (const product of DEMO_DATASET.products.filter((item) => item.isActive)) {
      const history = usageHistory(product.id);
      const fullMonths = history.slice(0, 11);
      const average = fullMonths.reduce((sum, value) => sum + value, 0) / fullMonths.length;
      active += 1;
      if ((history[11] ?? 0) < average) partialLower += 1;
    }
    expect(partialLower / active).toBeGreaterThan(0.9);
  });
});
