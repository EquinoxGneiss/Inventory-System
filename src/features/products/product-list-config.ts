import { defineListQuery } from "@/lib/list-query/list-query";

export const PRODUCT_FILTERS = ["low_stock", "out_of_stock", "archived"] as const;
export type ProductFilter = (typeof PRODUCT_FILTERS)[number];

export const PRODUCT_SORT_FIELDS = [
  "sku",
  "name",
  "category",
  "type",
  "on_hand",
  "reserved",
  "available",
  "minimum",
  "updated",
] as const;
export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];

export const PRODUCT_GROUP_FIELDS = ["category", "type"] as const;
export type ProductGroupField = (typeof PRODUCT_GROUP_FIELDS)[number];

export const productListQuery = defineListQuery({
  filters: PRODUCT_FILTERS,
  sortFields: PRODUCT_SORT_FIELDS,
  groupFields: PRODUCT_GROUP_FIELDS,
  facets: ["category"] as const,
  defaultSort: { field: "name", direction: "asc" },
});

export type ProductListQuery = ReturnType<typeof productListQuery.parse>;

export const PRODUCT_FILTER_LABELS: Record<ProductFilter, string> = {
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  archived: "Archived",
};

/** Filters that need `stock:read`; hidden (and ignored server-side) otherwise. */
export const STOCK_FILTERS: ReadonlySet<ProductFilter> = new Set(["low_stock", "out_of_stock"]);

export const PRODUCT_GROUP_LABELS: Record<ProductGroupField, string> = {
  category: "Category",
  type: "Product Type",
};

/** Saved views offered under Favorites (spec §5.2). */
export const PRODUCT_SAVED_VIEWS = [
  { key: "all_active", label: "All Active", params: "" },
  { key: "low_stock", label: "Low Stock", params: "filter=low_stock&sort=available" },
  { key: "by_category", label: "By Category", params: "group=category" },
  { key: "recently_updated", label: "Recently Updated", params: "sort=-updated" },
] as const;

export const PRODUCT_LIST_PATH = "/inventory/products";
