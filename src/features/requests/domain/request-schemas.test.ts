import { describe, expect, it } from "vitest";

import { buildRequestDraftSchema } from "./request-schemas";

const precisions: Record<string, number> = { "prd-paper": 0, "prd-soap": 2 };

const schema = buildRequestDraftSchema({
  getProductPrecision: (id) => precisions[id],
  allowedBuildingIds: ["bld-a"],
  today: "2026-11-18",
});

const valid = {
  buildingId: "bld-a",
  requiredDate: "2026-11-25",
  priority: "normal",
  notes: "",
  lines: [
    { productId: "prd-paper", quantity: "10" },
    { productId: "prd-soap", quantity: "2.5" },
  ],
};

function messages(input: unknown) {
  const result = schema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("request draft schema", () => {
  it("accepts a valid draft", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("requires at least one line (R5)", () => {
    expect(messages({ ...valid, lines: [] })).toHaveProperty("lines", "Add at least one product.");
  });

  it("enforces each product's unit precision without float math (R4)", () => {
    const errors = messages({
      ...valid,
      lines: [
        { productId: "prd-paper", quantity: "1.5" },
        { productId: "prd-soap", quantity: "1.255" },
      ],
    });
    expect(errors["lines.0.quantity"]).toBe("This unit only allows whole numbers.");
    expect(errors["lines.1.quantity"]).toBe("This unit allows at most 2 decimal places.");
  });

  it("rejects zero, negative and non-numeric quantities", () => {
    for (const quantity of ["0", "0.00", "-3", "abc", "1e3"]) {
      const errors = messages({ ...valid, lines: [{ productId: "prd-paper", quantity }] });
      expect(errors["lines.0.quantity"], quantity).toBeTruthy();
    }
  });

  it("rejects products outside the organization and duplicate lines", () => {
    const errors = messages({
      ...valid,
      lines: [
        { productId: "prd-paper", quantity: "1" },
        { productId: "prd-paper", quantity: "2" },
        { productId: "prd-other-org", quantity: "1" },
      ],
    });
    expect(errors["lines.1.productId"]).toMatch(/Already on line 1/);
    expect(errors["lines.2.productId"]).toMatch(/isn't available/);
  });

  it("rejects buildings outside the actor's scope and past required dates", () => {
    const errors = messages({ ...valid, buildingId: "bld-b", requiredDate: "2026-11-01" });
    expect(errors.buildingId).toBe("You can't request for this building.");
    expect(errors.requiredDate).toBe("Required date can't be in the past.");
  });

  it("rejects unknown fields such as browser-supplied approval data", () => {
    const result = schema.safeParse({ ...valid, approvedBy: "someone" });
    expect(result.success).toBe(false);
    const lineResult = schema.safeParse({
      ...valid,
      lines: [{ productId: "prd-paper", quantity: "1", approved: "1" }],
    });
    expect(lineResult.success).toBe(false);
  });
});
