import {
  hasPermission,
  type Permission,
  type PermissionHolder,
} from "@/lib/authorization/permissions";
import type { StatusTone } from "@/lib/status-tone";

/**
 * Inventory request lifecycle (implementation.md §7.1, UI/UX spec §6.1).
 * This is the single source of user-visible state labels — never duplicate
 * these strings in pages.
 */
export const REQUEST_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "changes_requested",
  "rejected",
  "approved",
  "waiting_stock",
  "ready_for_release",
  "in_transit",
  "partially_received",
  "completed",
  "cancelled",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_STATUS_META: Record<RequestStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Submitted", tone: "info" },
  under_review: { label: "Under Review", tone: "warning" },
  changes_requested: { label: "Changes Requested", tone: "warning" },
  rejected: { label: "Rejected", tone: "danger" },
  approved: { label: "Approved", tone: "success" },
  waiting_stock: { label: "Waiting for Stock", tone: "warning" },
  ready_for_release: { label: "Ready for Release", tone: "success" },
  in_transit: { label: "In Transit", tone: "transit" },
  partially_received: { label: "Partially Received", tone: "transit" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

export const REQUEST_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export const REQUEST_PRIORITY_META: Record<RequestPriority, { label: string; tone: StatusTone }> = {
  low: { label: "Low", tone: "muted" },
  normal: { label: "Normal", tone: "neutral" },
  high: { label: "High", tone: "warning" },
  urgent: { label: "Urgent", tone: "danger" },
};

/** Statuses after which the document is closed and read-only. */
export const CLOSED_STATUSES: ReadonlySet<RequestStatus> = new Set<RequestStatus>([
  "completed",
  "rejected",
  "cancelled",
]);

/** Only drafts are editable through the record form. */
export function isEditableStatus(status: RequestStatus): boolean {
  return status === "draft";
}

// ---------------------------------------------------------------------------
// Commands (implementation.md §7.2)
// ---------------------------------------------------------------------------

export const REQUEST_COMMANDS = [
  "submit_request",
  "cancel_request",
  "start_review",
  "approve_request",
  "request_changes",
  "reject_request",
  "revise_request",
  "reserve_stock",
  "retry_reservation",
  "post_release",
  "confirm_receipt",
] as const;

export type RequestCommand = (typeof REQUEST_COMMANDS)[number];

interface Transition {
  command: RequestCommand;
  from: readonly RequestStatus[];
  /** Possible resulting statuses (several when the outcome depends on stock). */
  to: readonly RequestStatus[];
  permission: Permission;
}

/**
 * Transition table. The database RPCs in Phase 5 enforce the same rules; this
 * table drives which commands the UI offers.
 */
export const REQUEST_TRANSITIONS: readonly Transition[] = [
  { command: "submit_request", from: ["draft"], to: ["submitted"], permission: "requests:create" },
  { command: "cancel_request", from: ["draft"], to: ["cancelled"], permission: "requests:create" },
  // Cancelling a submitted request is an "authorized cancel" (§7.1).
  {
    command: "cancel_request",
    from: ["submitted"],
    to: ["cancelled"],
    permission: "requests:approve",
  },
  {
    command: "start_review",
    from: ["submitted"],
    to: ["under_review"],
    permission: "requests:approve",
  },
  {
    command: "approve_request",
    from: ["submitted", "under_review"],
    to: ["approved"],
    permission: "requests:approve",
  },
  {
    command: "request_changes",
    from: ["under_review"],
    to: ["changes_requested"],
    permission: "requests:approve",
  },
  {
    command: "reject_request",
    from: ["submitted", "under_review"],
    to: ["rejected"],
    permission: "requests:approve",
  },
  {
    command: "revise_request",
    from: ["changes_requested"],
    to: ["draft"],
    permission: "requests:create",
  },
  {
    command: "reserve_stock",
    from: ["approved"],
    to: ["ready_for_release", "waiting_stock"],
    permission: "releases:prepare",
  },
  {
    command: "retry_reservation",
    from: ["waiting_stock"],
    to: ["ready_for_release", "waiting_stock"],
    permission: "releases:prepare",
  },
  {
    command: "post_release",
    from: ["ready_for_release"],
    to: ["in_transit"],
    permission: "releases:post",
  },
  {
    command: "confirm_receipt",
    from: ["in_transit", "partially_received"],
    to: ["partially_received", "completed"],
    permission: "receipts:confirm",
  },
];

export const REQUEST_COMMAND_META: Record<
  RequestCommand,
  { label: string; emphasis: "primary" | "secondary" | "danger"; requiresReason: boolean }
> = {
  submit_request: { label: "Submit", emphasis: "primary", requiresReason: false },
  cancel_request: { label: "Cancel Request", emphasis: "secondary", requiresReason: true },
  start_review: { label: "Start Review", emphasis: "primary", requiresReason: false },
  approve_request: { label: "Approve", emphasis: "primary", requiresReason: false },
  request_changes: { label: "Request Changes", emphasis: "secondary", requiresReason: true },
  reject_request: { label: "Reject", emphasis: "danger", requiresReason: true },
  revise_request: { label: "Revise", emphasis: "primary", requiresReason: false },
  reserve_stock: { label: "Reserve Stock", emphasis: "primary", requiresReason: false },
  retry_reservation: { label: "Retry Reservation", emphasis: "primary", requiresReason: false },
  post_release: { label: "Post Release", emphasis: "primary", requiresReason: false },
  confirm_receipt: { label: "Confirm Receipt", emphasis: "primary", requiresReason: false },
};

/**
 * Commands the holder may attempt from the given status. Record scope (which
 * buildings the actor can see) is enforced separately by the repository/RLS.
 */
export function allowedCommands(status: RequestStatus, holder: PermissionHolder): RequestCommand[] {
  const commands: RequestCommand[] = [];
  for (const transition of REQUEST_TRANSITIONS) {
    if (!transition.from.includes(status)) continue;
    if (!hasPermission(holder, transition.permission)) continue;
    if (!commands.includes(transition.command)) commands.push(transition.command);
  }
  return commands;
}

export function nextStatuses(status: RequestStatus, command: RequestCommand): RequestStatus[] {
  const result = new Set<RequestStatus>();
  for (const transition of REQUEST_TRANSITIONS) {
    if (transition.command === command && transition.from.includes(status)) {
      for (const target of transition.to) result.add(target);
    }
  }
  return [...result];
}

// ---------------------------------------------------------------------------
// User-facing stage bar (§7.1 "UI state bar shows the user-facing stages")
// ---------------------------------------------------------------------------

export const REQUEST_STAGES = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "approved", label: "Approved" },
  { key: "ready_for_release", label: "Ready for Release" },
  { key: "in_transit", label: "In Transit" },
  { key: "completed", label: "Completed" },
] as const;

export type RequestStageKey = (typeof REQUEST_STAGES)[number]["key"];

/**
 * Map a status onto the stage bar. Branch states keep the stage where the
 * document sits and surface the branch as an exception badge.
 */
export function stageForStatus(status: RequestStatus): {
  stage: RequestStageKey | null;
  exception: RequestStatus | null;
} {
  switch (status) {
    case "draft":
    case "submitted":
    case "under_review":
    case "approved":
    case "ready_for_release":
    case "in_transit":
    case "completed":
      return { stage: status, exception: null };
    case "changes_requested":
    case "rejected":
      return { stage: "under_review", exception: status };
    case "waiting_stock":
      return { stage: "approved", exception: status };
    case "partially_received":
      return { stage: "in_transit", exception: status };
    case "cancelled":
      return { stage: null, exception: status };
  }
}

// ---------------------------------------------------------------------------
// Queues used by preset filters and overview cards
// ---------------------------------------------------------------------------

export const REQUEST_QUEUES = {
  pending_approval: ["submitted", "under_review"],
  awaiting_reservation: ["approved", "waiting_stock"],
  ready_for_release: ["ready_for_release"],
  awaiting_receipt: ["in_transit", "partially_received"],
  completed: ["completed"],
  rejected: ["rejected"],
  drafts: ["draft", "changes_requested"],
} as const satisfies Record<string, readonly RequestStatus[]>;

export type RequestQueue = keyof typeof REQUEST_QUEUES;
