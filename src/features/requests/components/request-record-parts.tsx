import { Paperclip, Stamp, Truck } from "lucide-react";
import Link from "next/link";

import { ActivityTimeline } from "@/components/erp/activity/activity-timeline";
import { EmptyState } from "@/components/erp/feedback/empty-state";
import { StatusBadge } from "@/components/erp/feedback/status-badge";
import type { NotebookTab } from "@/components/erp/record-form/notebook-tabs";
import { PendingCommandButton } from "@/components/erp/record-form/pending-command-button";
import { RecordStatusBar } from "@/components/erp/status-bar/record-status-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PermissionHolder } from "@/lib/authorization/permissions";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  REQUEST_COMMAND_META,
  REQUEST_STAGES,
  REQUEST_STATUS_META,
  allowedCommands,
  stageForStatus,
  type RequestStatus,
} from "../domain/request-status";
import type { DecisionAction, InventoryRequest, RequestLine } from "../types";

export const COMMANDS_PENDING_REASON =
  "Workflow commands are connected in Phase 5. This demo build shows which actions your role would have.";

export function RequestStatusBar({ status }: { status: RequestStatus }) {
  const { stage, exception } = stageForStatus(status);
  return (
    <RecordStatusBar
      label="Request status"
      stages={REQUEST_STAGES}
      current={stage}
      exception={exception ? REQUEST_STATUS_META[exception] : null}
    />
  );
}

/** Commands the current role could run from this status, shown as not-yet-connected. */
export function RequestCommands({
  status,
  holder,
}: {
  status: RequestStatus;
  holder: PermissionHolder;
}) {
  const commands = allowedCommands(status, holder);
  if (commands.length === 0) return null;
  return (
    <>
      {commands.map((command) => {
        const meta = REQUEST_COMMAND_META[command];
        return (
          <PendingCommandButton
            key={command}
            label={meta.label}
            emphasis={meta.emphasis}
            reason={COMMANDS_PENDING_REASON}
          />
        );
      })}
    </>
  );
}

const QUANTITY_COLUMNS: Array<{
  key: keyof Pick<RequestLine, "requested" | "approved" | "reserved" | "released" | "received">;
  label: string;
  help: string;
  className: string;
}> = [
  { key: "requested", label: "Requested", help: "Asked for by the building", className: "" },
  {
    key: "approved",
    label: "Approved",
    help: "Approved by the Organization Admin",
    className: "bg-erp-success-tint/50",
  },
  {
    key: "reserved",
    label: "Reserved",
    help: "Held at the warehouse, not yet released",
    className: "bg-erp-warning-tint/50",
  },
  {
    key: "released",
    label: "Released",
    help: "Posted out of the warehouse",
    className: "bg-erp-brand-tint/60",
  },
  {
    key: "received",
    label: "Received",
    help: "Confirmed by the receiving building",
    className: "bg-erp-info-tint/60",
  },
];

/** Read-only line grid with the five quantity stages kept visibly distinct (spec §5.5). */
export function RequestLinesTable({ lines }: { lines: RequestLine[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader className="bg-erp-surface-muted">
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>UoM</TableHead>
              {QUANTITY_COLUMNS.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn("text-right", column.className)}
                  title={column.help}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="max-w-96">
                  <Link href={`/inventory/products/${line.productId}`} className="hover:underline">
                    <span className="font-mono text-xs text-erp-text-muted">{line.sku}</span>{" "}
                    <span className="font-medium">{line.productName}</span>
                  </Link>
                </TableCell>
                <TableCell>{line.uom}</TableCell>
                {QUANTITY_COLUMNS.map((column) => {
                  const value = line[column.key];
                  return (
                    <TableCell
                      key={column.key}
                      className={cn("text-right tabular-nums", column.className)}
                    >
                      {value === null ? (
                        <span className="text-erp-text-muted">
                          —<span className="sr-only">not yet approved</span>
                        </span>
                      ) : (
                        formatQuantity(value)
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul
        className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-erp-text-muted"
        aria-label="Quantity columns"
      >
        {QUANTITY_COLUMNS.map((column) => (
          <li key={column.key}>
            <span className="font-medium text-erp-text-subtle">{column.label}:</span> {column.help}
          </li>
        ))}
      </ul>
    </div>
  );
}

const DECISION_META: Record<
  DecisionAction,
  { label: string; tone: "success" | "danger" | "warning" | "muted" }
> = {
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  changes_requested: { label: "Changes requested", tone: "warning" },
  cancelled: { label: "Cancelled", tone: "muted" },
};

/** Approval History, Fulfillment, Documents and Activity tabs shared by every request view. */
export function requestSecondaryTabs(request: InventoryRequest): NotebookTab[] {
  return [
    {
      value: "approvals",
      label: "Approval History",
      count: request.decisions.length,
      content:
        request.decisions.length === 0 ? (
          <EmptyState
            size="compact"
            icon={Stamp}
            title="No decisions yet"
            description={`Routed to ${request.approverName} (Organization Admin) once submitted.`}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {request.decisions.map((decision) => {
              const meta = DECISION_META[decision.action];
              return (
                <li key={decision.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge label={meta.label} tone={meta.tone} />
                    <span className="text-sm font-medium">{decision.actorName}</span>
                    <time className="text-xs text-erp-text-muted" dateTime={decision.at}>
                      {formatDateTime(decision.at)}
                    </time>
                  </div>
                  {decision.note ? (
                    <p className="mt-2 text-sm text-erp-text-subtle">{decision.note}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ),
    },
    {
      value: "fulfillment",
      label: "Fulfillment",
      count: request.documents.length,
      content:
        request.documents.length === 0 ? (
          <EmptyState
            size="compact"
            icon={Truck}
            title="Nothing released yet"
            description="Release and receipt documents appear here after the Organization Admin posts a release."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-erp-surface-muted">
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead>State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">{document.reference}</TableCell>
                      <TableCell>
                        {document.kind === "release" ? "Stock release" : "Receipt"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(document.date)}
                      </TableCell>
                      <TableCell>{document.actorName}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {document.from} → {document.to}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={
                            document.state === "posted"
                              ? "Posted"
                              : document.state === "partial"
                                ? "Partial"
                                : "Done"
                          }
                          tone={document.state === "partial" ? "transit" : "success"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {request.discrepancy ? (
              <p className="rounded-md border border-erp-warning/30 bg-erp-warning-tint px-3 py-2 text-sm">
                <span className="font-semibold text-erp-warning">Discrepancy recorded: </span>
                {request.discrepancy}
              </p>
            ) : null}
          </div>
        ),
    },
    {
      value: "documents",
      label: "Documents",
      content: (
        <EmptyState
          size="compact"
          icon={Paperclip}
          title="No attachments"
          description="Supporting files (quotes, photos of damaged goods) can be attached once private storage is connected."
        />
      ),
    },
    {
      value: "activity",
      label: "Activity",
      count: request.activity.length,
      content: <ActivityTimeline events={request.activity} />,
    },
  ];
}
