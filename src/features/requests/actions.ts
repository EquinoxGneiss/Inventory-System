"use server";

import { z } from "zod";

import { hasPermission } from "@/lib/authorization/permissions";
import { getSessionContext } from "@/lib/demo/session";
import { manilaToday } from "@/lib/format";
import { productPrecisionLookup } from "@/features/products/data/product-repository";
import { getRequest, requestableBuildings } from "./data/request-repository";
import { buildRequestDraftSchema } from "./domain/request-schemas";
import { isEditableStatus } from "./domain/request-status";
import { canEditDraft } from "./domain/request-access";

export type ValidateDraftResult =
  | { ok: true; persisted: false; lineCount: number }
  | { ok: false; formError?: string; fieldErrors: Array<{ path: string; message: string }> };

const envelopeSchema = z.strictObject({
  requestId: z.string().min(1).max(64).nullable(),
  draft: z.unknown(),
});

/**
 * Server-side validation of a request draft (implementation.md §10 steps 1–3).
 * Re-resolves the session, re-checks permission and record state, and re-parses
 * the draft against trusted product and building data.
 *
 * Phase 1 does NOT persist anything — the result says so explicitly and the UI
 * tells the user. Phase 5 replaces this with the `save_request_draft` command.
 */
export async function validateRequestDraft(input: unknown): Promise<ValidateDraftResult> {
  const envelope = envelopeSchema.safeParse(input);
  if (!envelope.success) {
    return {
      ok: false,
      formError: "The request couldn't be read. Reload and try again.",
      fieldErrors: [],
    };
  }

  const session = await getSessionContext();
  if (!hasPermission(session, "requests:create")) {
    return { ok: false, formError: "Your role can't create or edit requests.", fieldErrors: [] };
  }

  if (envelope.data.requestId) {
    const existing = getRequest(session, envelope.data.requestId);
    if (!existing) {
      return {
        ok: false,
        formError: "This request doesn't exist or you don't have access to it.",
        fieldErrors: [],
      };
    }
    if (!isEditableStatus(existing.status) || !canEditDraft(session, existing)) {
      return {
        ok: false,
        formError: "Only drafts you own or manage can be edited.",
        fieldErrors: [],
      };
    }
  }

  const schema = buildRequestDraftSchema({
    getProductPrecision: productPrecisionLookup(session),
    allowedBuildingIds: requestableBuildings(session).map((building) => building.id),
    today: manilaToday(),
  });
  const parsed = schema.safeParse(envelope.data.draft);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.issues.map((issue) => ({
        path: issue.path.map(String).join("."),
        message: issue.message,
      })),
    };
  }
  return { ok: true, persisted: false, lineCount: parsed.data.lines.length };
}
