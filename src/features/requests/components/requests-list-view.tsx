"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { Clock3, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { ColumnSelector } from "@/components/erp/control-panel/column-selector";
import {
  ERPControlPanel,
  type FacetOption,
} from "@/components/erp/control-panel/erp-control-panel";
import { ERPDataTable } from "@/components/erp/data-table/erp-data-table";
import { ListStateProvider } from "@/components/erp/data-table/list-state";
import type { ERPColumnDef, ERPTableFeatures } from "@/components/erp/data-table/table-features";
import { EmptyState } from "@/components/erp/feedback/empty-state";
import { StatusBadge } from "@/components/erp/feedback/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import type { ListSort } from "@/lib/list-query/list-query";
import { REQUEST_PRIORITY_META, REQUEST_STATUS_META } from "../domain/request-status";
import {
  REQUEST_FILTER_META,
  REQUEST_GROUP_FIELDS,
  REQUEST_GROUP_LABELS,
  REQUEST_LIST_PATH,
  REQUEST_SAVED_VIEWS,
  type RequestFilter,
  type RequestGroupField,
} from "../request-list-config";
import type { RequestListRow } from "../types";

const helper = createColumnHelper<ERPTableFeatures, RequestListRow>();

function RequiredDateCell({ row }: { row: RequestListRow }) {
  return (
    <span
      className={
        row.isOverdue ? "inline-flex items-center gap-1 font-medium text-erp-danger" : undefined
      }
    >
      {row.isOverdue ? <Clock3 aria-hidden className="size-3.5" /> : null}
      {formatDate(row.requiredDate)}
      {row.isOverdue ? <span className="sr-only"> (overdue)</span> : null}
    </span>
  );
}

const COLUMN_DEFS = [
  helper.accessor("reference", {
    id: "reference",
    header: "Reference",
    meta: { label: "Reference", hideable: false },
  }),
  helper.accessor("requesterName", {
    id: "requester",
    header: "Requester",
    meta: { label: "Requester" },
  }),
  helper.accessor("buildingName", {
    id: "building",
    header: "Building",
    meta: { label: "Building" },
  }),
  helper.accessor("requestDate", {
    id: "request_date",
    header: "Request Date",
    cell: (info) => (
      <time dateTime={info.getValue()} title={formatDateTime(info.getValue())}>
        {formatDate(info.getValue())}
      </time>
    ),
    meta: { label: "Request Date" },
  }),
  helper.accessor("requiredDate", {
    id: "required_date",
    header: "Required Date",
    cell: (info) => <RequiredDateCell row={info.row.original} />,
    meta: { label: "Required Date" },
  }),
  helper.accessor("itemCount", {
    id: "items",
    header: "Items",
    meta: { label: "Item Count", align: "right" },
  }),
  helper.accessor("priority", {
    id: "priority",
    header: "Priority",
    cell: (info) => {
      const meta = REQUEST_PRIORITY_META[info.getValue()];
      return <StatusBadge label={meta.label} tone={meta.tone} />;
    },
    meta: { label: "Priority" },
  }),
  helper.accessor("approverName", {
    id: "approver",
    header: "Approver",
    enableSorting: false,
    meta: { label: "Approver", defaultHidden: true },
  }),
  helper.accessor("status", {
    id: "status",
    header: "Status",
    cell: (info) => {
      const meta = REQUEST_STATUS_META[info.getValue()];
      return <StatusBadge label={meta.label} tone={meta.tone} />;
    },
    meta: { label: "Status", hideable: false },
  }),
];

const COLUMNS: ERPColumnDef<RequestListRow>[] = helper.columns(COLUMN_DEFS);

const GROUP_KEYS: Record<RequestGroupField, (row: RequestListRow) => string> = {
  status: (row) => REQUEST_STATUS_META[row.status].label,
  building: (row) => row.buildingName,
  priority: (row) => REQUEST_PRIORITY_META[row.priority].label,
};

export interface RequestsListViewProps {
  rows: RequestListRow[];
  total: number;
  page: number;
  size: number;
  sort: ListSort<string>;
  group: RequestGroupField | null;
  groupCounts: Record<string, number> | null;
  availableFilters: RequestFilter[];
  buildings: Array<{ id: string; name: string }>;
  /** Present when the list is filtered to one product (from a product's smart button). */
  productFacet: { id: string; label: string } | null;
  canCreate: boolean;
  hasQuery: boolean;
}

export function RequestsListView({
  rows,
  total,
  page,
  size,
  sort,
  group,
  groupCounts,
  availableFilters,
  buildings,
  productFacet,
  canCreate,
  hasQuery,
}: RequestsListViewProps) {
  const selectableColumns = useMemo(
    () =>
      COLUMNS.flatMap((column) =>
        column.id && column.meta?.hideable !== false
          ? [
              {
                id: column.id,
                label: column.meta?.label ?? column.id,
                defaultHidden: column.meta?.defaultHidden,
              },
            ]
          : [],
      ),
    [],
  );

  const facets: FacetOption[] = [];
  if (buildings.length > 1) {
    facets.push({
      param: "building",
      label: "Building",
      options: buildings.map((building) => ({ value: building.id, label: building.name })),
    });
  }
  if (productFacet) {
    facets.push({
      param: "product",
      label: "Product",
      options: [{ value: productFacet.id, label: productFacet.label }],
    });
  }

  return (
    <ListStateProvider>
      <div className="flex flex-col gap-3">
        <ERPControlPanel
          searchLabel="Search requests"
          searchPlaceholder="Search reference, requester, building or product…"
          actions={
            canCreate ? (
              <Button asChild>
                <Link href={`${REQUEST_LIST_PATH}/new`}>
                  <Plus aria-hidden />
                  New
                </Link>
              </Button>
            ) : null
          }
          filters={availableFilters.map((filter) => ({
            key: filter,
            label: REQUEST_FILTER_META[filter].label,
            group: REQUEST_FILTER_META[filter].group,
          }))}
          facets={facets}
          groups={REQUEST_GROUP_FIELDS.map((key) => ({ key, label: REQUEST_GROUP_LABELS[key] }))}
          savedViews={REQUEST_SAVED_VIEWS.map((view) => ({ ...view }))}
          trailing={<ColumnSelector listKey="requests" columns={selectableColumns} />}
        />
        <ERPDataTable
          listKey="requests"
          caption="Inventory requests"
          columns={COLUMNS}
          data={rows}
          total={total}
          page={page}
          size={size}
          sort={sort}
          getRowId={(row) => row.id}
          getRowHref={(row) => `${REQUEST_LIST_PATH}/${row.id}`}
          getRowLabel={(row) => row.reference}
          primaryColumnId="reference"
          grouping={
            group && groupCounts
              ? {
                  label: REQUEST_GROUP_LABELS[group],
                  getKey: GROUP_KEYS[group],
                  counts: groupCounts,
                }
              : null
          }
          emptyState={
            <EmptyState
              title={hasQuery ? "No requests match these filters" : "No requests yet"}
              description={
                hasQuery
                  ? "Try removing a filter, or search by reference such as REQ-2026-000123."
                  : canCreate
                    ? "Create a request to ask the Organization Admin for stock."
                    : "Requests from your buildings will appear here."
              }
            />
          }
          renderMobileCard={(row) => {
            const status = REQUEST_STATUS_META[row.status];
            return (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-erp-text">{row.reference}</p>
                  <p className="truncate text-xs text-erp-text-muted">
                    {row.buildingName} · {row.requesterName}
                  </p>
                  <p className="mt-0.5 text-xs text-erp-text-muted">
                    Needed <RequiredDateCell row={row} /> · {row.itemCount} item
                    {row.itemCount === 1 ? "" : "s"}
                  </p>
                </div>
                <StatusBadge label={status.label} tone={status.tone} />
              </div>
            );
          }}
        />
      </div>
    </ListStateProvider>
  );
}
