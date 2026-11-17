import { Activity, ListChecks, PackageCheck, Truck } from "lucide-react";

import { StatusBadge } from "@/components/erp/feedback/status-badge";
import { NotebookTabs } from "@/components/erp/record-form/notebook-tabs";
import {
  ReadOnlyField,
  ReadOnlyFieldList,
  RecordFieldGrid,
  RecordForm,
} from "@/components/erp/record-form/record-form";
import { SmartButton } from "@/components/erp/smart-buttons/smart-button";
import type { PermissionHolder } from "@/lib/authorization/permissions";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  CLOSED_STATUSES,
  REQUEST_PRIORITY_META,
  REQUEST_STATUS_META,
} from "../domain/request-status";
import type { InventoryRequest } from "../types";
import {
  RequestCommands,
  RequestLinesTable,
  RequestStatusBar,
  requestSecondaryTabs,
} from "./request-record-parts";

export interface RequestDetailViewProps {
  request: InventoryRequest;
  buildingName: string;
  organizationName: string;
  isOverdue: boolean;
  holder: PermissionHolder;
  readOnlyReason: string;
}

/** Read-only request record (any non-draft state, or drafts the viewer can't edit). */
export function RequestDetailView({
  request,
  buildingName,
  organizationName,
  isOverdue,
  holder,
  readOnlyReason,
}: RequestDetailViewProps) {
  const status = REQUEST_STATUS_META[request.status];
  const priority = REQUEST_PRIORITY_META[request.priority];
  const releases = request.documents.filter((document) => document.kind === "release").length;
  const receipts = request.documents.filter((document) => document.kind === "receipt").length;

  return (
    <RecordForm
      actions={<RequestCommands status={request.status} holder={holder} />}
      statusBar={<RequestStatusBar status={request.status} />}
      readOnlyReason={readOnlyReason}
      title={request.reference}
      badges={
        <>
          <StatusBadge label={status.label} tone={status.tone} srPrefix="Status" />
          {isOverdue ? <StatusBadge label="Overdue" tone="danger" /> : null}
        </>
      }
      context={
        <>
          {organizationName} · {buildingName}
        </>
      }
      smartButtons={
        <>
          <SmartButton
            icon={ListChecks}
            label="Products"
            value={String(request.lines.length)}
            href="?tab=lines"
          />
          <SmartButton
            icon={Truck}
            label="Releases"
            value={String(releases)}
            href="?tab=fulfillment"
          />
          <SmartButton
            icon={PackageCheck}
            label="Receipts"
            value={String(receipts)}
            href="?tab=fulfillment"
          />
          <SmartButton
            icon={Activity}
            label="Activity"
            value={String(request.activity.length)}
            href="?tab=activity"
          />
        </>
      }
    >
      <RecordFieldGrid>
        <ReadOnlyFieldList>
          <ReadOnlyField label="Requesting building">{buildingName}</ReadOnlyField>
          <ReadOnlyField label="Requester">{request.requesterName}</ReadOnlyField>
          <ReadOnlyField label="Request date">{formatDateTime(request.requestDate)}</ReadOnlyField>
          <ReadOnlyField label="Required date">
            <span className={isOverdue ? "font-medium text-erp-danger" : undefined}>
              {formatDate(request.requiredDate)}
              {isOverdue && !CLOSED_STATUSES.has(request.status) ? " (overdue)" : ""}
            </span>
          </ReadOnlyField>
        </ReadOnlyFieldList>
        <ReadOnlyFieldList>
          <ReadOnlyField label="Priority">
            <StatusBadge label={priority.label} tone={priority.tone} />
          </ReadOnlyField>
          <ReadOnlyField label="Approver">
            {request.approverName} (Organization Admin)
          </ReadOnlyField>
          <ReadOnlyField label="Notes">
            {request.notes || <span className="text-erp-text-muted">No notes</span>}
          </ReadOnlyField>
        </ReadOnlyFieldList>
      </RecordFieldGrid>
      <NotebookTabs
        label="Request details"
        tabs={[
          {
            value: "lines",
            label: "Requested Products",
            count: request.lines.length,
            content: <RequestLinesTable lines={request.lines} />,
          },
          ...requestSecondaryTabs(request),
        ]}
      />
    </RecordForm>
  );
}
