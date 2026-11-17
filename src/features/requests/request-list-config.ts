import type { Permission } from "@/lib/authorization/permissions";
import { defineListQuery } from "@/lib/list-query/list-query";
import { REQUEST_QUEUES, type RequestQueue } from "./domain/request-status";

export const REQUEST_FILTERS = [
  "mine",
  "pending_approval",
  "awaiting_reservation",
  "ready_for_release",
  "awaiting_receipt",
  "completed",
  "rejected",
  "drafts",
  "overdue",
] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];

export const REQUEST_SORT_FIELDS = [
  "reference",
  "requester",
  "building",
  "request_date",
  "required_date",
  "items",
  "priority",
  "status",
] as const;
export type RequestSortField = (typeof REQUEST_SORT_FIELDS)[number];

export const REQUEST_GROUP_FIELDS = ["status", "building", "priority"] as const;
export type RequestGroupField = (typeof REQUEST_GROUP_FIELDS)[number];

export const requestListQuery = defineListQuery({
  filters: REQUEST_FILTERS,
  sortFields: REQUEST_SORT_FIELDS,
  groupFields: REQUEST_GROUP_FIELDS,
  facets: ["building", "product"] as const,
  defaultSort: { field: "request_date", direction: "desc" },
});

export type RequestListQuery = ReturnType<typeof requestListQuery.parse>;

export const REQUEST_FILTER_META: Record<
  RequestFilter,
  {
    label: string;
    queue?: RequestQueue;
    permission?: Permission;
    group: "scope" | "stage" | "timing";
  }
> = {
  mine: { label: "My Requests", permission: "requests:create", group: "scope" },
  pending_approval: { label: "Pending Approval", queue: "pending_approval", group: "stage" },
  awaiting_reservation: {
    label: "Awaiting Reservation",
    queue: "awaiting_reservation",
    group: "stage",
  },
  ready_for_release: { label: "Ready for Release", queue: "ready_for_release", group: "stage" },
  awaiting_receipt: { label: "Awaiting Receipt", queue: "awaiting_receipt", group: "stage" },
  completed: { label: "Completed", queue: "completed", group: "stage" },
  rejected: { label: "Rejected", queue: "rejected", group: "stage" },
  drafts: { label: "Drafts & Revisions", queue: "drafts", group: "stage" },
  overdue: { label: "Overdue", group: "timing" },
};

export const REQUEST_GROUP_LABELS: Record<RequestGroupField, string> = {
  status: "Status",
  building: "Building",
  priority: "Priority",
};

export const REQUEST_SAVED_VIEWS = [
  { key: "all", label: "All Requests", params: "" },
  {
    key: "approval_queue",
    label: "Approval Queue",
    params: "filter=pending_approval&sort=request_date",
  },
  { key: "by_building", label: "By Building", params: "group=building" },
  {
    key: "overdue_first",
    label: "Overdue, Oldest First",
    params: "filter=overdue&sort=required_date",
  },
] as const;

export const REQUEST_LIST_PATH = "/inventory/requests";

export { REQUEST_QUEUES };
