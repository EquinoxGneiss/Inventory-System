import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime, formatQuantity, manilaToday } from "./format";

describe("Philippines display formatting (spec §10.5)", () => {
  it("formats timestamps in Asia/Manila regardless of the host timezone", () => {
    // 16:30 UTC is 00:30 the next day in Manila.
    expect(formatDate("2026-11-17T16:30:00Z")).toBe(formatDate("2026-11-18"));
    expect(formatDateTime("2026-11-17T16:30:00Z")).toMatch(/18.*2026.*12:30/);
  });

  it("uses unambiguous month names", () => {
    expect(formatDate("2026-03-04")).toMatch(/Mar/);
  });

  it("computes today's Manila calendar date", () => {
    expect(manilaToday(new Date("2026-11-17T16:30:00Z"))).toBe("2026-11-18");
    expect(manilaToday(new Date("2026-11-17T15:59:00Z"))).toBe("2026-11-17");
  });

  it("groups thousands in decimal strings without rounding", () => {
    expect(formatQuantity("1234567.125", "kg")).toBe("1,234,567.125 kg");
    expect(formatQuantity("950")).toBe("950");
    expect(formatQuantity("-2.25", "L")).toBe("-2.25 L");
  });
});
