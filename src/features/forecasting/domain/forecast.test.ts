import { describe, expect, it } from "vitest";

import { decimalFromMinorUnits } from "@/lib/validation/quantity";
import {
  computeForecast,
  roundUpToStep,
  statusForCoverage,
  weightedMovingAverage,
} from "./forecast";

describe("forecast heuristic", () => {
  it("weights the last three months 1:2:3, oldest to newest", () => {
    // (10*1 + 20*2 + 30*3) / 6 = 23.33 → rounded up to 24
    expect(weightedMovingAverage([999, 10, 20, 30], 1)).toBe(24);
    expect(weightedMovingAverage([30], 1)).toBe(30);
    expect(weightedMovingAverage([], 1)).toBe(0);
  });

  it("rounds up to whole unit steps", () => {
    expect(roundUpToStep(101, 100)).toBe(200);
    expect(roundUpToStep(200, 100)).toBe(200);
    expect(roundUpToStep(0, 100)).toBe(0);
    // 2.5 L history in minor units (precision 2) → forecast rounds up to 3 L
    expect(weightedMovingAverage([250, 250, 250], 100)).toBe(300);
  });

  it("needs the larger of forecast use and requested quantity, plus safety stock", () => {
    const fromUsage = computeForecast({
      completeMonths: [30, 30, 30],
      pending: 10,
      minimum: 20,
      available: 100,
      step: 1,
    });
    expect(fromUsage.expectedUse).toBe(30);
    expect(fromUsage.need).toBe(50);
    const fromRequests = computeForecast({
      completeMonths: [30, 30, 30],
      pending: 45,
      minimum: 20,
      available: 100,
      step: 1,
    });
    expect(fromRequests.expectedUse).toBe(45);
    expect(fromRequests.need).toBe(65);
  });

  it("computes shortfall, coverage and a suggested order", () => {
    const result = computeForecast({
      completeMonths: [40, 40, 40],
      pending: 0,
      minimum: 20,
      available: 15,
      step: 1,
    });
    expect(result).toMatchObject({
      need: 60,
      shortfall: 45,
      coveragePct: 25,
      status: "short",
      suggestedOrder: 45,
    });
    const decimals = computeForecast({
      completeMonths: [250, 250, 250],
      pending: 0,
      minimum: 150,
      available: 120,
      step: 100,
    });
    expect(decimalFromMinorUnits(decimals.need, 2)).toBe("4.5");
    expect(decimalFromMinorUnits(decimals.shortfall, 2)).toBe("3.3");
    expect(decimalFromMinorUnits(decimals.suggestedOrder, 2)).toBe("4");
  });

  it("classifies coverage at the documented thresholds", () => {
    expect(statusForCoverage(99)).toBe("short");
    expect(statusForCoverage(100)).toBe("at_risk");
    expect(statusForCoverage(124)).toBe("at_risk");
    expect(statusForCoverage(125)).toBe("covered");
  });

  it("treats a zero need as fully covered", () => {
    const result = computeForecast({
      completeMonths: [0, 0, 0],
      pending: 0,
      minimum: 0,
      available: 0,
      step: 1,
    });
    expect(result).toMatchObject({ need: 0, coveragePct: 100, shortfall: 0, suggestedOrder: 0 });
  });

  it("never counts negative availability", () => {
    const result = computeForecast({
      completeMonths: [10, 10, 10],
      pending: 0,
      minimum: 0,
      available: -5,
      step: 1,
    });
    expect(result.available).toBe(0);
    expect(result.shortfall).toBe(10);
  });
});
