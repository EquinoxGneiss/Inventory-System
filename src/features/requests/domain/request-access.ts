import { hasPermission } from "@/lib/authorization/permissions";
import type { SessionContext } from "@/lib/authorization/types";
import type { InventoryRequest } from "../types";
import { isEditableStatus } from "./request-status";

/**
 * A draft is editable by its requester, or by a building manager of the
 * requesting building, provided they can create requests. Organization-wide
 * roles review submitted requests; they don't edit other people's drafts.
 */
export function canEditDraft(
  session: SessionContext,
  request: Pick<InventoryRequest, "status" | "requesterId" | "buildingId">,
): boolean {
  if (!isEditableStatus(request.status)) return false;
  if (!hasPermission(session, "requests:create")) return false;
  if (request.requesterId === session.user.id) return true;
  return session.memberships.some(
    (membership) =>
      membership.role === "building_manager" && membership.buildingId === request.buildingId,
  );
}
