import { z } from "zod";

import { quantityIssueMessage, validateQuantity } from "@/lib/validation/quantity";
import { REQUEST_PRIORITIES } from "./request-status";

/**
 * Draft request schema, shared by the client form and the server action
 * (implementation.md §10: "Parse with Zod; reject unknown/unexpected fields").
 * Unit precision and "today" are injected so the same rules run on both sides
 * against trusted data on the server.
 */

export const MAX_REQUEST_LINES = 100;
export const MAX_NOTES_LENGTH = 1000;

export interface RequestDraftSchemaContext {
  /** Decimal places allowed for a product's base unit; `undefined` = unknown product. */
  getProductPrecision: (productId: string) => number | undefined;
  /** Buildings the actor may request for. */
  allowedBuildingIds: readonly string[];
  /** Today's Manila calendar date (YYYY-MM-DD). */
  today: string;
}

const lineShape = z.strictObject({
  productId: z.string().min(1, "Select a product."),
  quantity: z.string().trim().min(1, "Enter a quantity."),
});

export function buildRequestDraftSchema(context: RequestDraftSchemaContext) {
  return z
    .strictObject({
      buildingId: z
        .string()
        .min(1, "Select the requesting building.")
        .refine((id) => context.allowedBuildingIds.includes(id), {
          message: "You can't request for this building.",
        }),
      requiredDate: z.iso
        .date({ message: "Enter the date the items are needed." })
        .refine((date) => date >= context.today, {
          message: "Required date can't be in the past.",
        }),
      priority: z.enum(REQUEST_PRIORITIES, { message: "Choose a priority." }),
      notes: z
        .string()
        .trim()
        .max(MAX_NOTES_LENGTH, `Keep notes under ${MAX_NOTES_LENGTH} characters.`),
      lines: z
        .array(lineShape)
        .min(1, "Add at least one product.")
        .max(MAX_REQUEST_LINES, `A request can have at most ${MAX_REQUEST_LINES} lines.`),
    })
    .superRefine((draft, ctx) => {
      const seen = new Map<string, number>();
      draft.lines.forEach((line, index) => {
        if (!line.productId) return;
        const precision = context.getProductPrecision(line.productId);
        if (precision === undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["lines", index, "productId"],
            message: "This product isn't available in this organization.",
          });
        } else if (line.quantity) {
          const issue = validateQuantity(line.quantity, precision);
          if (issue) {
            ctx.addIssue({
              code: "custom",
              path: ["lines", index, "quantity"],
              message: quantityIssueMessage(issue, precision),
            });
          }
        }
        const firstIndex = seen.get(line.productId);
        if (firstIndex !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["lines", index, "productId"],
            message: `Already on line ${firstIndex + 1}; change that quantity instead.`,
          });
        } else {
          seen.set(line.productId, index);
        }
      });
    });
}

export type RequestDraftInput = z.input<ReturnType<typeof buildRequestDraftSchema>>;
export type RequestDraft = z.output<ReturnType<typeof buildRequestDraftSchema>>;

export function emptyRequestDraft(buildingId: string, requiredDate: string): RequestDraftInput {
  return {
    buildingId,
    requiredDate,
    priority: "normal",
    notes: "",
    lines: [{ productId: "", quantity: "" }],
  };
}
