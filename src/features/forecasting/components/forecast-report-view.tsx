"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { CalendarClock, CircleCheck, TriangleAlert, TrendingUp } from "lucide-react";
import { useMemo } from "react";

import { MeterList } from "@/components/erp/charts/meter-list";
import { StatTile } from "@/components/erp/charts/stat-tile";
import { ColumnSelector } from "@/components/erp/control-panel/column-selector";
import { ERPControlPanel } from "@/components/erp/control-panel/erp-control-panel";
import { ERPDataTable } from "@/components/erp/data-table/erp-data-table";
import { ListStateProvider } from "@/components/erp/data-table/list-state";
import type { ERPColumnDef, ERPTableFeatures } from "@/components/erp/data-table/table-features";
import { EmptyState } from "@/components/erp/feedback/empty-state";
import { StatusBadge } from "@/components/erp/feedback/status-badge";
import { formatCount, formatQuantity } from "@/lib/format";
import type { ListSort } from "@/lib/list-query/list-query";
import type { ForecastRow, ForecastSummary } from "../data/forecast-repository";
import { FORECAST_MONTH_LABEL, FORECAST_STATUS_META, formatCoverage } from "../domain/forecast";
import {
  FORECAST_FILTERS,
  FORECAST_FILTER_LABELS,
  FORECAST_GROUP_FIELDS,
  FORECAST_GROUP_LABELS,
  FORECAST_SAVED_VIEWS,
  type ForecastGroupField,
} from "../forecast-list-config";

const helper = createColumnHelper<ERPTableFeatures, ForecastRow>();

const quantity = (value: string) => formatQuantity(value);

const COLUMN_DEFS = [
  helper.accessor("sku", {
    id: "sku",
    header: "SKU",
    cell: (info) => <span className="font-mono text-[13px]">{info.getValue()}</span>,
    meta: { label: "SKU", hideable: false },
  }),
  helper.accessor("name", {
    id: "name",
    header: "Product",
    meta: { label: "Product", hideable: false, className: "max-w-72 truncate" },
  }),
  helper.accessor("categoryName", {
    id: "category",
    header: "Category",
    meta: { label: "Category", defaultHidden: true },
  }),
  helper.accessor("uom", {
    id: "uom",
    header: "UoM",
    enableSorting: false,
    meta: { label: "Unit of Measure" },
  }),
  helper.accessor("usage", {
    id: "usage",
    header: "Forecast use",
    enableSorting: false,
    cell: (info) => quantity(info.getValue()),
    meta: { label: "Forecast use", align: "right" },
  }),
  helper.accessor("pending", {
    id: "pending",
    header: "Requested",
    enableSorting: false,
    cell: (info) => quantity(info.getValue()),
    meta: { label: "Already requested", align: "right" },
  }),
  helper.accessor("minimum", {
    id: "minimum",
    header: "Safety stock",
    enableSorting: false,
    cell: (info) => quantity(info.getValue()),
    meta: { label: "Safety stock", align: "right", defaultHidden: true },
  }),
  helper.accessor("need", {
    id: "need",
    header: "Need (Dec)",
    enableSorting: false,
    cell: (info) => <span className="font-semibold">{quantity(info.getValue())}</span>,
    meta: { label: "Need next month", align: "right" },
  }),
  helper.accessor("available", {
    id: "available",
    header: "Available",
    enableSorting: false,
    cell: (info) => quantity(info.getValue()),
    meta: { label: "Available now", align: "right" },
  }),
  helper.accessor("shortfall", {
    id: "shortfall",
    header: "Shortfall",
    enableSorting: false,
    cell: (info) =>
      info.getValue() === "0" ? (
        <span className="text-erp-text-muted">—</span>
      ) : (
        <span className="font-semibold text-erp-danger">{quantity(info.getValue())}</span>
      ),
    meta: { label: "Shortfall", align: "right" },
  }),
  helper.accessor("suggestedOrder", {
    id: "suggested",
    header: "Suggested order",
    enableSorting: false,
    cell: (info) =>
      info.getValue() === "0" ? (
        <span className="text-erp-text-muted">—</span>
      ) : (
        quantity(info.getValue())
      ),
    meta: { label: "Suggested order", align: "right" },
  }),
  helper.accessor("coveragePct", {
    id: "coverage",
    header: "Coverage",
    cell: (info) => {
      const meta = FORECAST_STATUS_META[info.row.original.status];
      return (
        <span className="inline-flex items-center gap-2">
          <span className="w-12 text-right tabular-nums">{formatCoverage(info.getValue())}</span>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </span>
      );
    },
    meta: { label: "Coverage", hideable: false },
  }),
];

const COLUMNS: ERPColumnDef<ForecastRow>[] = helper.columns(COLUMN_DEFS);

const GROUP_KEYS: Record<ForecastGroupField, (row: ForecastRow) => string> = {
  category: (row) => row.categoryName,
  status: (row) => FORECAST_STATUS_META[row.status].label,
};

export interface ForecastReportViewProps {
  rows: ForecastRow[];
  total: number;
  page: number;
  size: number;
  sort: ListSort<string>;
  group: ForecastGroupField | null;
  groupCounts: Record<string, number> | null;
  summary: ForecastSummary;
  lowestCoverage: ForecastRow[];
  categories: Array<{ id: string; name: string }>;
  hasQuery: boolean;
}

function productHref(row: ForecastRow): string {
  return `/inventory/products/${row.id}?tab=forecast`;
}

export function ForecastReportView({
  rows,
  total,
  page,
  size,
  sort,
  group,
  groupCounts,
  summary,
  lowestCoverage,
  categories,
  hasQuery,
}: ForecastReportViewProps) {
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

  return (
    <ListStateProvider>
      <div className="flex flex-col gap-4">
        <ERPControlPanel
          searchLabel="Search forecast"
          searchPlaceholder="Search SKU or product…"
          filters={FORECAST_FILTERS.map((filter) => ({
            key: filter,
            label: FORECAST_FILTER_LABELS[filter],
            group: "status",
          }))}
          facets={[
            {
              param: "category",
              label: "Category",
              options: categories.map((category) => ({ value: category.id, label: category.name })),
            },
          ]}
          groups={FORECAST_GROUP_FIELDS.map((key) => ({ key, label: FORECAST_GROUP_LABELS[key] }))}
          savedViews={FORECAST_SAVED_VIEWS.map((view) => ({ ...view }))}
          trailing={<ColumnSelector listKey="forecast" columns={selectableColumns} />}
        />

        <section aria-label="Forecast summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Short next month"
            value={formatCount(summary.short)}
            note={`of ${formatCount(summary.total)} products · available stock below the need`}
            icon={TriangleAlert}
            tone="danger"
          />
          <StatTile
            label="At risk"
            value={formatCount(summary.at_risk)}
            note="Covered, but with under 25% headroom"
            icon={TrendingUp}
            tone="warning"
          />
          <StatTile
            label="Covered"
            value={formatCount(summary.covered)}
            note="At least 125% of the need is available"
            icon={CircleCheck}
            tone="success"
          />
          <StatTile
            label="Forecast month"
            value={FORECAST_MONTH_LABEL}
            note="Based on demo usage through October 2026"
            icon={CalendarClock}
          />
        </section>

        <section aria-labelledby="coverage-chart" className="rounded-lg border bg-card p-4">
          <h2 id="coverage-chart" className="text-[15px] font-semibold text-erp-text">
            Lowest coverage for {FORECAST_MONTH_LABEL}
          </h2>
          <p className="mb-2 text-xs text-erp-text-muted">
            Share of next month&apos;s need that stock available now covers, lowest first. Matches
            the filters above.
          </p>
          {lowestCoverage.length === 0 ? (
            <EmptyState size="compact" title="No products match these filters" />
          ) : (
            <MeterList
              label={`Lowest coverage for ${FORECAST_MONTH_LABEL}`}
              rows={lowestCoverage.map((row) => ({
                id: row.id,
                label: row.name,
                sublabel: row.sku,
                href: productHref(row),
                ratio: row.coveragePct / 100,
                figure: `${formatCoverage(row.coveragePct)} covered · need ${formatQuantity(row.need, row.uom)} · have ${formatQuantity(row.available, row.uom)}`,
                status: {
                  label: FORECAST_STATUS_META[row.status].label,
                  tone: FORECAST_STATUS_META[row.status].tone,
                },
              }))}
            />
          )}
        </section>

        <ERPDataTable
          listKey="forecast"
          caption={`Stock forecast for ${FORECAST_MONTH_LABEL}`}
          columns={COLUMNS}
          data={rows}
          total={total}
          page={page}
          size={size}
          sort={sort}
          getRowId={(row) => row.id}
          getRowHref={productHref}
          getRowLabel={(row) => `${row.sku} ${row.name}`}
          primaryColumnId="name"
          grouping={
            group && groupCounts
              ? {
                  label: FORECAST_GROUP_LABELS[group],
                  getKey: GROUP_KEYS[group],
                  counts: groupCounts,
                }
              : null
          }
          emptyState={
            <EmptyState
              title={hasQuery ? "No products match these filters" : "No forecast available"}
              description={
                hasQuery ? "Try removing a filter." : "Forecasts appear for active products."
              }
            />
          }
          renderMobileCard={(row) => {
            const meta = FORECAST_STATUS_META[row.status];
            return (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-erp-text">{row.name}</p>
                  <p className="text-xs text-erp-text-muted">
                    Need {formatQuantity(row.need, row.uom)} · have{" "}
                    {formatQuantity(row.available, row.uom)}
                  </p>
                </div>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge label={meta.label} tone={meta.tone} />
                  <span className="text-xs text-erp-text-muted tabular-nums">
                    {formatCoverage(row.coveragePct)} covered
                  </span>
                </span>
              </div>
            );
          }}
        />
      </div>
    </ListStateProvider>
  );
}
