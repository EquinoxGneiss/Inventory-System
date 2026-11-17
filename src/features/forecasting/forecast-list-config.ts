import { defineListQuery } from "@/lib/list-query/list-query";
import { FORECAST_STATUSES, FORECAST_STATUS_META, type ForecastStatus } from "./domain/forecast";

export const FORECAST_FILTERS = FORECAST_STATUSES;
export type ForecastFilter = ForecastStatus;

export const FORECAST_SORT_FIELDS = ["coverage", "sku", "name", "category"] as const;
export type ForecastSortField = (typeof FORECAST_SORT_FIELDS)[number];

export const FORECAST_GROUP_FIELDS = ["category", "status"] as const;
export type ForecastGroupField = (typeof FORECAST_GROUP_FIELDS)[number];

export const forecastListQuery = defineListQuery({
  filters: FORECAST_FILTERS,
  sortFields: FORECAST_SORT_FIELDS,
  groupFields: FORECAST_GROUP_FIELDS,
  facets: ["category"] as const,
  defaultSort: { field: "coverage", direction: "asc" },
});

export type ForecastListQuery = ReturnType<typeof forecastListQuery.parse>;

export const FORECAST_FILTER_LABELS: Record<ForecastFilter, string> = {
  short: FORECAST_STATUS_META.short.label,
  at_risk: FORECAST_STATUS_META.at_risk.label,
  covered: FORECAST_STATUS_META.covered.label,
};

export const FORECAST_GROUP_LABELS: Record<ForecastGroupField, string> = {
  category: "Category",
  status: "Forecast status",
};

export const FORECAST_SAVED_VIEWS = [
  { key: "all", label: "All products", params: "" },
  { key: "short", label: "Short next month", params: "filter=short" },
  { key: "needs_attention", label: "Short or at risk", params: "filter=short,at_risk" },
  { key: "by_category", label: "By category", params: "group=category" },
] as const;

export const FORECAST_REPORT_PATH = "/inventory/reports/forecast";
