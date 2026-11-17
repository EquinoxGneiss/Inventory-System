import type { RequestPriority, RequestStatus } from "./domain/request-status";

export interface RequestLine {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  uom: string;
  precision: number;
  /** All quantities are decimal strings in the product's base unit. */
  requested: string;
  /** `null` until the request has been approved. */
  approved: string | null;
  reserved: string;
  released: string;
  received: string;
}

export type DecisionAction = "approved" | "rejected" | "changes_requested" | "cancelled";

export interface RequestDecision {
  id: string;
  action: DecisionAction;
  actorName: string;
  at: string;
  note: string;
}

export interface ActivityEvent {
  id: string;
  at: string;
  actorName: string;
  summary: string;
  note?: string;
}

export interface FulfillmentDocument {
  id: string;
  kind: "release" | "receipt";
  reference: string;
  date: string;
  actorName: string;
  state: "posted" | "done" | "partial";
  from: string;
  to: string;
  /** Quantities moved by this document, per request line id. */
  quantities: Record<string, string>;
  note?: string;
}

export interface InventoryRequest {
  id: string;
  organizationId: string;
  reference: string;
  buildingId: string;
  /** Demo persona id when the requester is a demo persona; otherwise null. */
  requesterId: string | null;
  requesterName: string;
  approverName: string;
  status: RequestStatus;
  priority: RequestPriority;
  /** ISO timestamp. */
  requestDate: string;
  /** Manila calendar date (YYYY-MM-DD). */
  requiredDate: string;
  notes: string;
  /** Optimistic-concurrency version (expectedVersion in Phase 5 commands). */
  version: number;
  lines: RequestLine[];
  decisions: RequestDecision[];
  activity: ActivityEvent[];
  documents: FulfillmentDocument[];
  discrepancy: string | null;
}

export interface RequestListRow {
  id: string;
  reference: string;
  requesterName: string;
  buildingId: string;
  buildingName: string;
  requestDate: string;
  requiredDate: string;
  itemCount: number;
  priority: RequestPriority;
  approverName: string;
  status: RequestStatus;
  isOverdue: boolean;
}
