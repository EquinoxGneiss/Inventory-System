import "server-only";

import { hasPermission } from "@/lib/authorization/permissions";
import { canAccessBuilding, type SessionContext } from "@/lib/authorization/types";
import { DEMO_AS_OF_DATE } from "@/lib/demo/constants";
import { clampPage, type PageResult } from "@/lib/list-query/list-query";
import { DEMO_DATASET } from "@/features/inventory/data/demo-dataset";
import {
  buildingsForOrganization,
  getBuilding,
} from "@/features/organizations/data/mock-organizations";
import type { Building } from "@/features/organizations/types";
import {
  CLOSED_STATUSES,
  REQUEST_PRIORITIES,
  REQUEST_PRIORITY_META,
  REQUEST_QUEUES,
  REQUEST_STATUSES,
  REQUEST_STATUS_META,
  type RequestQueue,
  type RequestStatus,
} from "../domain/request-status";
import {
  REQUEST_FILTER_META,
  type RequestFilter,
  type RequestGroupField,
  type RequestListQuery,
} from "../request-list-config";
import type { InventoryRequest, RequestListRow } from "../types";

/**
 * Phase 1 request repository over the in-memory demo dataset.
 *
 * Visibility rules (mirrors the RLS policies planned for Phase 2/5):
 * - Requires `requests:read` and the active organization.
 * - Building-scoped users see only their assigned buildings.
 * - Drafts (and returned revisions) are private to their requester and the
 *   building's own users until submitted; approvers see them once submitted.
 */

function isPrivateDraft(request: InventoryRequest): boolean {
  return request.status === "draft" || request.status === "changes_requested";
}

function isVisible(session: SessionContext, request: InventoryRequest): boolean {
  if (request.organizationId !== session.organization.id) return false;
  if (!hasPermission(session, "requests:read")) return false;
  if (!canAccessBuilding(session, request.buildingId)) return false;
  if (isPrivateDraft(request)) {
    const managesBuilding = session.memberships.some(
      (membership) =>
        membership.role === "building_manager" && membership.buildingId === request.buildingId,
    );
    return request.requesterId === session.user.id || managesBuilding;
  }
  return true;
}

function visibleRequests(session: SessionContext): InventoryRequest[] {
  return DEMO_DATASET.requests.filter((request) => isVisible(session, request));
}

export function isOverdue(request: Pick<InventoryRequest, "status" | "requiredDate">): boolean {
  return (
    !CLOSED_STATUSES.has(request.status) &&
    request.status !== "draft" &&
    request.requiredDate < DEMO_AS_OF_DATE
  );
}

function toListRow(request: InventoryRequest): RequestListRow {
  return {
    id: request.id,
    reference: request.reference,
    requesterName: request.requesterName,
    buildingId: request.buildingId,
    buildingName: getBuilding(request.buildingId)?.name ?? request.buildingId,
    requestDate: request.requestDate,
    requiredDate: request.requiredDate,
    itemCount: request.lines.length,
    priority: request.priority,
    approverName: request.approverName,
    status: request.status,
    isOverdue: isOverdue(request),
  };
}

function groupKey(row: RequestListRow, group: RequestGroupField): string {
  switch (group) {
    case "status":
      return REQUEST_STATUS_META[row.status].label;
    case "building":
      return row.buildingName;
    case "priority":
      return REQUEST_PRIORITY_META[row.priority].label;
  }
}

function groupOrder(row: RequestListRow, group: RequestGroupField): number | string {
  switch (group) {
    case "status":
      return REQUEST_STATUSES.indexOf(row.status);
    case "priority":
      return REQUEST_PRIORITIES.length - REQUEST_PRIORITIES.indexOf(row.priority);
    case "building":
      return row.buildingName;
  }
}

const textCompare = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });

function matchesFilters(
  session: SessionContext,
  request: InventoryRequest,
  filters: readonly RequestFilter[],
): boolean {
  // Stage filters combine with OR; scope and timing filters narrow with AND.
  const stageFilters = filters.filter((filter) => REQUEST_FILTER_META[filter].group === "stage");
  if (stageFilters.length > 0) {
    const statuses = new Set<RequestStatus>(
      stageFilters.flatMap((filter) => {
        const queue = REQUEST_FILTER_META[filter].queue;
        return queue ? [...REQUEST_QUEUES[queue]] : [];
      }),
    );
    if (!statuses.has(request.status)) return false;
  }
  if (filters.includes("mine") && request.requesterId !== session.user.id) return false;
  if (filters.includes("overdue") && !isOverdue(request)) return false;
  return true;
}

export function listRequests(
  session: SessionContext,
  query: RequestListQuery,
): PageResult<RequestListRow> {
  const term = query.q.toLowerCase();
  const rows = visibleRequests(session)
    .filter((request) => matchesFilters(session, request, query.filters))
    .filter((request) => !query.facets.building || request.buildingId === query.facets.building)
    .filter(
      (request) =>
        !query.facets.product ||
        request.lines.some((line) => line.productId === query.facets.product),
    )
    .filter(
      (request) =>
        !term ||
        request.reference.toLowerCase().includes(term) ||
        request.requesterName.toLowerCase().includes(term) ||
        (getBuilding(request.buildingId)?.name.toLowerCase().includes(term) ?? false) ||
        request.lines.some(
          (line) =>
            line.sku.toLowerCase().includes(term) || line.productName.toLowerCase().includes(term),
        ),
    )
    .map(toListRow);

  const direction = query.sort.direction === "asc" ? 1 : -1;
  const compareRows = (a: RequestListRow, b: RequestListRow): number => {
    switch (query.sort.field) {
      case "reference":
        return a.reference.localeCompare(b.reference);
      case "requester":
        return textCompare(a.requesterName, b.requesterName);
      case "building":
        return textCompare(a.buildingName, b.buildingName);
      case "request_date":
        return a.requestDate.localeCompare(b.requestDate);
      case "required_date":
        return a.requiredDate.localeCompare(b.requiredDate);
      case "items":
        return a.itemCount - b.itemCount;
      case "priority":
        return REQUEST_PRIORITIES.indexOf(a.priority) - REQUEST_PRIORITIES.indexOf(b.priority);
      case "status":
        return REQUEST_STATUSES.indexOf(a.status) - REQUEST_STATUSES.indexOf(b.status);
    }
  };

  const group = query.group;
  rows.sort((a, b) => {
    if (group) {
      const left = groupOrder(a, group);
      const right = groupOrder(b, group);
      const byGroup =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : textCompare(String(left), String(right));
      if (byGroup !== 0) return byGroup;
    }
    return compareRows(a, b) * direction || b.reference.localeCompare(a.reference);
  });

  let groupCounts: Record<string, number> | null = null;
  if (group) {
    groupCounts = {};
    for (const row of rows) {
      const key = groupKey(row, group);
      groupCounts[key] = (groupCounts[key] ?? 0) + 1;
    }
  }

  const total = rows.length;
  const page = clampPage(query.page, query.size, total);
  const start = (page - 1) * query.size;
  return {
    rows: rows.slice(start, start + query.size),
    total,
    page,
    size: query.size,
    groupCounts,
  };
}

export function requestGroupLabel(row: RequestListRow, group: RequestGroupField): string {
  return groupKey(row, group);
}

/**
 * Returns the request only when the session may see it. Out-of-scope and
 * missing records are indistinguishable to the caller (no existence leak).
 */
export function getRequest(session: SessionContext, requestId: string): InventoryRequest | null {
  const request = DEMO_DATASET.requests.find((item) => item.id === requestId);
  return request && isVisible(session, request) ? request : null;
}

export function countRequestQueues(
  session: SessionContext,
): Record<RequestQueue | "overdue" | "mine_open", number> {
  const visible = visibleRequests(session);
  const counts = Object.fromEntries(
    (Object.keys(REQUEST_QUEUES) as RequestQueue[]).map((queue) => [
      queue,
      visible.filter((request) =>
        (REQUEST_QUEUES[queue] as readonly RequestStatus[]).includes(request.status),
      ).length,
    ]),
  ) as Record<RequestQueue, number>;
  return {
    ...counts,
    overdue: visible.filter(isOverdue).length,
    mine_open: visible.filter(
      (request) => request.requesterId === session.user.id && !CLOSED_STATUSES.has(request.status),
    ).length,
  };
}

export function listRecentRequests(session: SessionContext, limit = 8): RequestListRow[] {
  return visibleRequests(session)
    .filter((request) => request.status !== "draft")
    .sort((a, b) => b.requestDate.localeCompare(a.requestDate))
    .slice(0, limit)
    .map(toListRow);
}

export function searchRequests(
  session: SessionContext,
  term: string,
  limit = 6,
): Array<{ id: string; reference: string; buildingName: string; status: RequestStatus }> {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  return visibleRequests(session)
    .filter((request) => request.reference.toLowerCase().includes(needle))
    .sort((a, b) => b.reference.localeCompare(a.reference))
    .slice(0, limit)
    .map((request) => ({
      id: request.id,
      reference: request.reference,
      buildingName: getBuilding(request.buildingId)?.name ?? "",
      status: request.status,
    }));
}

/** Buildings the session may raise requests for. */
export function requestableBuildings(session: SessionContext): Building[] {
  if (!hasPermission(session, "requests:create")) return [];
  return buildingsForOrganization(session.organization.id).filter((building) =>
    canAccessBuilding(session, building.id),
  );
}

/** Buildings visible in filters (the session's building scope). */
export function visibleBuildings(session: SessionContext): Building[] {
  return buildingsForOrganization(session.organization.id).filter((building) =>
    canAccessBuilding(session, building.id),
  );
}
