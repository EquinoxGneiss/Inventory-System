import { describe, expect, it } from "vitest";

import {
  addDecimal,
  compareDecimal,
  decimalFromMinorUnits,
  normalizeDecimal,
  subtractDecimal,
  sumDecimals,
  validateQuantity,
} from "./quantity";

describe("quantity validation", () => {
  it("validates against unit precision", () => {
    expect(validateQuantity("12", 0)).toBeNull();
    expect(validateQuantity("2.50", 1)).toBeNull(); // trailing zeros are not significant
    expect(validateQuantity("2.55", 1)).toBe("too_precise");
    expect(validateQuantity("0", 0)).toBe("not_positive");
    expect(validateQuantity("-1", 0)).toBe("invalid");
    expect(validateQuantity("1,000", 0)).toBe("invalid");
    expect(validateQuantity("1234567890123", 0)).toBe("too_large");
  });
});

describe("exact decimal arithmetic", () => {
  it("avoids floating-point drift", () => {
    expect(addDecimal("0.1", "0.2")).toBe("0.3");
    expect(sumDecimals(["0.1", "0.1", "0.1"])).toBe("0.3");
    expect(subtractDecimal("26.5", "26.5")).toBe("0");
    expect(subtractDecimal("10", "12.25")).toBe("-2.25");
  });

  it("compares decimal strings of different scale", () => {
    expect(compareDecimal("2.5", "2.50")).toBe(0);
    expect(compareDecimal("10", "9.999")).toBe(1);
    expect(compareDecimal("0.01", "0.1")).toBe(-1);
  });

  it("converts minor units and normalizes", () => {
    expect(decimalFromMinorUnits(1250, 2)).toBe("12.5");
    expect(decimalFromMinorUnits(7, 3)).toBe("0.007");
    expect(decimalFromMinorUnits(42, 0)).toBe("42");
    expect(normalizeDecimal("007.500")).toBe("7.5");
  });
});
