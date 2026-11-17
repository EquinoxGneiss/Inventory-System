"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { TriangleAlert } from "lucide-react";
import { useMemo } from "react";

import { ColumnSelector } from "@/components/erp/control-panel/column-selector";
import { ERPControlPanel } from "@/components/erp/control-panel/erp-control-panel";
import { ERPDataTable } from "@/components/erp/data-table/erp-data-table";
import { ListStateProvider } from "@/components/erp/data-table/list-state";
import type { ERPColumnDef, ERPTableFeatures } from "@/components/erp/data-table/table-features";
import { EmptyState } from "@/components/erp/feedback/empty-state";
import { StatusBadge } from "@/components/erp/feedback/status-badge";
import { formatQuantity } from "@/lib/format";
import type { ListSort } from "@/lib/list-query/list-query";
import {
  PRODUCT_FILTERS,
  PRODUCT_FILTER_LABELS,
  PRODUCT_GROUP_FIELDS,
  PRODUCT_GROUP_LABELS,
  PRODUCT_LIST_PATH,
  PRODUCT_SAVED_VIEWS,
  STOCK_FILTERS,
  type ProductGroupField,
} from "../product-list-config";
import { PRODUCT_TYPE_LABELS, type ProductListRow } from "../types";

const helper = createColumnHelper<ERPTableFeatures, ProductListRow>();

function QuantityCell({ value, uom }: { value: string | null; uom?: string }) {
  if (value === null) return <span className="text-erp-text-muted">—</span>;
  return <>{formatQuantity(value, uom)}</>;
}

const BASE_COLUMNS = [
  helper.accessor("sku", {
    id: "sku",
    header: "SKU",
    cell: (info) => <span className="font-mono text-[13px]">{info.getValue()}</span>,
    meta: { label: "SKU", hideable: false },
  }),
  helper.accessor("name", {
    id: "name",
    header: "Product Name",
    cell: (info) => info.getValue(),
    meta: { label: "Product Name", hideable: false, className: "max-w-80 truncate" },
  }),
  helper.accessor("categoryName", {
    id: "category",
    header: "Category",
    meta: { label: "Category" },
  }),
  helper.accessor("type", {
    id: "type",
    header: "Type",
    cell: (info) => PRODUCT_TYPE_LABELS[info.getValue()],
    meta: { label: "Type", defaultHidden: true },
  }),
  helper.accessor("uom", {
    id: "uom",
    header: "UoM",
    enableSorting: false,
    meta: { label: "Unit of Measure" },
  }),
];

const STOCK_COLUMNS = [
  helper.accessor("onHand", {
    id: "on_hand",
    header: "On Hand",
    cell: (info) => <QuantityCell value={info.getValue()} />,
    meta: { label: "On Hand", align: "right" },
  }),
  helper.accessor("reserved", {
    id: "reserved",
    header: "Reserved",
    cell: (info) => <QuantityCell value={info.getValue()} />,
    meta: { label: "Reserved", align: "right" },
  }),
  helper.accessor("available", {
    id: "available",
    header: "Available",
    cell: (info) => (
      <span className="inline-flex items-center gap-1.5">
        {info.row.original.isLowStock ? (
          <>
            <TriangleAlert aria-hidden className="size-3.5 text-erp-warning" />
            <span className="sr-only">Low stock: </span>
          </>
        ) : null}
        <span
          className={info.row.original.isLowStock ? "font-semibold text-erp-warning" : undefined}
        >
          <QuantityCell value={info.getValue()} />
        </span>
      </span>
    ),
    meta: { label: "Available", align: "right" },
  }),
  helper.accessor("minimum", {
    id: "minimum",
    header: "Minimum",
    cell: (info) => <QuantityCell value={info.getValue()} />,
    meta: { label: "Minimum", align: "right" },
  }),
];

const STATUS_COLUMN = helper.accessor("isActive", {
  id: "status",
  header: "Status",
  enableSorting: false,
  cell: (info) =>
    info.getValue() ? (
      <StatusBadge label="Active" tone="success" />
    ) : (
      <StatusBadge label="Archived" tone="muted" />
    ),
  meta: { label: "Status" },
});

const COLUMNS_WITH_STOCK: ERPColumnDef<ProductListRow>[] = helper.columns([
  ...BASE_COLUMNS,
  ...STOCK_COLUMNS,
  STATUS_COLUMN,
]);
const COLUMNS_WITHOUT_STOCK: ERPColumnDef<ProductListRow>[] = helper.columns([
  ...BASE_COLUMNS,
  STATUS_COLUMN,
]);

export interface ProductsListViewProps {
  rows: ProductListRow[];
  total: number;
  page: number;
  size: number;
  sort: ListSort<string>;
  group: ProductGroupField | null;
  groupCounts: Record<string, number> | null;
  canSeeStock: boolean;
  categories: Array<{ id: string; name: string }>;
  hasQuery: boolean;
}

export function ProductsListView({
  rows,
  total,
  page,
  size,
  sort,
  group,
  groupCounts,
  canSeeStock,
  categories,
  hasQuery,
}: ProductsListViewProps) {
  const columns = canSeeStock ? COLUMNS_WITH_STOCK : COLUMNS_WITHOUT_STOCK;
  const listKey = canSeeStock ? "products" : "products-limited";

  const selectableColumns = useMemo(
    () =>
      columns.flatMap((column) =>
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
    [columns],
  );

  const grouping =
    group && groupCounts
      ? {
          label: PRODUCT_GROUP_LABELS[group],
          getKey: (row: ProductListRow) =>
            group === "category" ? row.categoryName : PRODUCT_TYPE_LABELS[row.type],
          counts: groupCounts,
        }
      : null;

  return (
    <ListStateProvider>
      <div className="flex flex-col gap-3">
        <ERPControlPanel
          searchLabel="Search products"
          searchPlaceholder="Search SKU, name or barcode…"
          filters={PRODUCT_FILTERS.filter(
            (filter) => canSeeStock || !STOCK_FILTERS.has(filter),
          ).map((filter) => ({
            key: filter,
            label: PRODUCT_FILTER_LABELS[filter],
            group: filter === "archived" ? "status" : "stock",
          }))}
          facets={[
            {
              param: "category",
              label: "Category",
              options: categories.map((category) => ({ value: category.id, label: category.name })),
            },
          ]}
          groups={PRODUCT_GROUP_FIELDS.map((key) => ({ key, label: PRODUCT_GROUP_LABELS[key] }))}
          savedViews={PRODUCT_SAVED_VIEWS.filter(
            (view) => canSeeStock || view.key !== "low_stock",
          ).map((view) => ({ ...view }))}
          trailing={<ColumnSelector listKey={listKey} columns={selectableColumns} />}
        />
        <ERPDataTable
          listKey={listKey}
          caption="Products"
          columns={columns}
          data={rows}
          total={total}
          page={page}
          size={size}
          sort={sort}
          getRowId={(row) => row.id}
          getRowHref={(row) => `${PRODUCT_LIST_PATH}/${row.id}`}
          getRowLabel={(row) => `${row.sku} ${row.name}`}
          primaryColumnId="name"
          grouping={grouping}
          emptyState={
            <EmptyState
              title={hasQuery ? "No products match these filters" : "No products yet"}
              description={
                hasQuery
                  ? "Try removing a filter or searching by SKU or barcode."
                  : "Products appear here once the catalog is set up."
              }
            />
          }
          renderMobileCard={(row) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-erp-text">{row.name}</p>
                <p className="text-xs text-erp-text-muted">
                  <span className="font-mono">{row.sku}</span> · {row.categoryName}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {row.available !== null ? (
                  <p
                    className={
                      row.isLowStock
                        ? "text-sm font-semibold text-erp-warning tabular-nums"
                        : "text-sm tabular-nums"
                    }
                  >
                    {formatQuantity(row.available, row.uom)}
                    <span className="block text-xs font-normal text-erp-text-muted">
                      {row.isLowStock ? "available · low stock" : "available"}
                    </span>
                  </p>
                ) : (
                  <span className="text-xs text-erp-text-muted">{row.uom}</span>
                )}
              </div>
            </div>
          )}
        />
      </div>
    </ListStateProvider>
  );
}
