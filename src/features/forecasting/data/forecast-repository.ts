import "server-only";

import { hasPermission } from "@/lib/authorization/permissions";
import type { SessionContext } from "@/lib/authorization/types";
import { clampPage, type PageResult } from "@/lib/list-query/list-query";
import { decimalFromMinorUnits, minorUnitsFromDecimal } from "@/lib/validation/quantity";
import { DEMO_DATASET } from "@/features/inventory/data/demo-dataset";
import { availableStock } from "@/features/products/data/product-repository";
import type { Product } from "@/features/products/types";
import {
  FORECAST_STATUSES,
  FORECAST_STATUS_META,
  computeForecast,
  type ForecastResult,
  type ForecastStatus,
} from "../domain/forecast";
import type { ForecastGroupField, ForecastListQuery } from "../forecast-list-config";
import { USAGE_MONTHS, unitStep, usageHistory } from "./demo-usage-history";

/**
 * Demo forecast repository. Requires `stock:read` and is scoped to the active
 * organization's active products, like every other repository.
 */

export interface ForecastRow {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  uom: string;
  /** Decimal strings in the product's unit. */
  usage: string;
  pending: string;
  expectedUse: string;
  minimum: string;
  need: string;
  available: string;
  shortfall: string;
  suggestedOrder: string;
  coveragePct: number;
  status: ForecastStatus;
}

export type ForecastSummary = Record<ForecastStatus, number> & { total: number };

export interface ForecastListResult extends PageResult<ForecastRow> {
  summary: ForecastSummary;
  /** Lowest-coverage rows of the filtered set (for the coverage chart). */
  lowestCoverage: ForecastRow[];
}

/** Index of the last complete month in USAGE_MONTHS (October). */
const LAST_COMPLETE_INDEX = USAGE_MONTHS.findIndex((month) => month.partial) - 1;

function categoryName(categoryId: string): string {
  return (
    DEMO_DATASET.categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized"
  );
}

/**
 * Quantity already asked for on open requests that isn't reserved yet:
 * submitted/under review → requested; approved → approved;
 * waiting for stock → the unreserved remainder.
 */
function pendingDemand(organizationId: string): Map<string, number> {
  const pending = new Map<string, number>();
  for (const request of DEMO_DATASET.requests) {
    if (request.organizationId !== organizationId) continue;
    for (const line of request.lines) {
      const toMinor = (value: string) => minorUnitsFromDecimal(value, line.precision);
      let quantity = 0;
      if (request.status === "submitted" || request.status === "under_review") {
        quantity = toMinor(line.requested);
      } else if (request.status === "approved") {
        quantity = toMinor(line.approved ?? "0");
      } else if (request.status === "waiting_stock") {
        quantity = Math.max(0, toMinor(line.approved ?? "0") - toMinor(line.reserved));
      }
      if (quantity > 0) pending.set(line.productId, (pending.get(line.productId) ?? 0) + quantity);
    }
  }
  return pending;
}

function forecastFor(product: Product, pending: Map<string, number>): ForecastResult {
  const precision = product.uom.precision;
  const history = usageHistory(product.id);
  return computeForecast({
    completeMonths: history.slice(0, LAST_COMPLETE_INDEX + 1),
    pending: pending.get(product.id) ?? 0,
    minimum: minorUnitsFromDecimal(product.minimum, precision),
    available: minorUnitsFromDecimal(availableStock(product), precision),
    step: unitStep(precision),
  });
}

function toRow(product: Product, result: ForecastResult): ForecastRow {
  const precision = product.uom.precision;
  const decimal = (value: number) => decimalFromMinorUnits(value, precision);
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    categoryName: categoryName(product.categoryId),
    uom: product.uom.code,
    usage: decimal(result.usage),
    pending: decimal(result.pending),
    expectedUse: decimal(result.expectedUse),
    minimum: decimal(result.minimum),
    need: decimal(result.need),
    available: decimal(result.available),
    shortfall: decimal(result.shortfall),
    suggestedOrder: decimal(result.suggestedOrder),
    coveragePct: result.coveragePct,
    status: result.status,
  };
}

function forecastRows(session: SessionContext): ForecastRow[] {
  if (!hasPermission(session, "stock:read")) return [];
  const pending = pendingDemand(session.organization.id);
  return DEMO_DATASET.products
    .filter((product) => product.organizationId === session.organization.id && product.isActive)
    .map((product) => toRow(product, forecastFor(product, pending)));
}

const textCompare = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });

function groupKey(row: ForecastRow, group: ForecastGroupField): string {
  return group === "category" ? row.categoryName : FORECAST_STATUS_META[row.status].label;
}

function emptySummary(): ForecastSummary {
  return { short: 0, at_risk: 0, covered: 0, total: 0 };
}

export function listForecast(
  session: SessionContext,
  query: ForecastListQuery,
): ForecastListResult {
  const term = query.q.toLowerCase();
  const statuses = new Set(query.filters);
  const rows = forecastRows(session)
    .filter((row) => statuses.size === 0 || statuses.has(row.status))
    .filter((row) => !query.facets.category || row.categoryId === query.facets.category)
    .filter(
      (row) =>
        !term || row.sku.toLowerCase().includes(term) || row.name.toLowerCase().includes(term),
    );

  const summary = emptySummary();
  for (const row of rows) {
    summary[row.status] += 1;
    summary.total += 1;
  }

  const byCoverage = (a: ForecastRow, b: ForecastRow) =>
    a.coveragePct - b.coveragePct || textCompare(a.name, b.name);
  const lowestCoverage = [...rows].sort(byCoverage).slice(0, 10);

  const direction = query.sort.direction === "asc" ? 1 : -1;
  const compareRows = (a: ForecastRow, b: ForecastRow): number => {
    switch (query.sort.field) {
      case "coverage":
        return a.coveragePct - b.coveragePct;
      case "sku":
        return textCompare(a.sku, b.sku);
      case "name":
        return textCompare(a.name, b.name);
      case "category":
        return textCompare(a.categoryName, b.categoryName);
    }
  };
  const group = query.group;
  const statusOrder = (row: ForecastRow) => FORECAST_STATUSES.indexOf(row.status);
  rows.sort((a, b) => {
    if (group === "status") {
      const byStatus = statusOrder(a) - statusOrder(b);
      if (byStatus !== 0) return byStatus;
    } else if (group === "category") {
      const byCategory = textCompare(a.categoryName, b.categoryName);
      if (byCategory !== 0) return byCategory;
    }
    return compareRows(a, b) * direction || textCompare(a.sku, b.sku);
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
    summary,
    lowestCoverage,
  };
}

export function countShortNextMonth(session: SessionContext): number {
  return forecastRows(session).filter((row) => row.status === "short").length;
}

export interface UsagePoint {
  key: string;
  label: string;
  longLabel: string;
  partial: boolean;
  /** Quantity issued in the month, decimal string in the product unit. */
  quantity: string;
}

export interface ProductForecast {
  row: ForecastRow;
  /** Six complete months plus the current month to date, oldest first. */
  history: UsagePoint[];
}

/** Months shown on the product chart before the forecast month. */
const CHART_HISTORY_MONTHS = 6;

export function getProductForecast(
  session: SessionContext,
  productId: string,
): ProductForecast | null {
  if (!hasPermission(session, "stock:read")) return null;
  const product = DEMO_DATASET.products.find(
    (item) =>
      item.id === productId && item.organizationId === session.organization.id && item.isActive,
  );
  if (!product) return null;
  const row = toRow(product, forecastFor(product, pendingDemand(session.organization.id)));
  const usage = usageHistory(product.id);
  const firstIndex = LAST_COMPLETE_INDEX + 1 - CHART_HISTORY_MONTHS;
  const history = USAGE_MONTHS.slice(firstIndex).map((month, offset) => ({
    key: month.key,
    label: month.label,
    longLabel: month.longLabel,
    partial: month.partial,
    quantity: decimalFromMinorUnits(usage[firstIndex + offset] ?? 0, product.uom.precision),
  }));
  return { row, history };
}
