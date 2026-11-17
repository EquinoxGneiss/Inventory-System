import "server-only";

import { hasPermission } from "@/lib/authorization/permissions";
import type { SessionContext } from "@/lib/authorization/types";
import { clampPage, type PageResult } from "@/lib/list-query/list-query";
import {
  compareDecimal,
  isNegativeDecimal,
  subtractDecimal,
  sumDecimals,
} from "@/lib/validation/quantity";
import { DEMO_DATASET } from "@/features/inventory/data/demo-dataset";
import {
  STOCK_LOCATIONS,
  buildingReceivingLocation,
} from "@/features/organizations/data/mock-organizations";
import {
  STOCK_FILTERS,
  type ProductGroupField,
  type ProductListQuery,
} from "../product-list-config";
import {
  PRODUCT_TYPE_LABELS,
  type Product,
  type ProductCategory,
  type ProductListRow,
  type ProductMovement,
  type ProductOption,
} from "../types";

/**
 * Phase 1 product repository over the in-memory demo dataset. Every function
 * takes the session and scopes by its active organization, mirroring the RLS
 * policies Phase 3 will add. Quantity fields are withheld (null) unless the
 * session holds `stock:read`.
 */

interface StockSummary {
  onHand: string;
  reserved: string;
  available: string;
}

const internalLocationIds = new Set(
  STOCK_LOCATIONS.filter((location) => location.type === "internal").map((location) => location.id),
);

function summarizeStock(product: Product): StockSummary {
  const internal = product.balances.filter((balance) =>
    internalLocationIds.has(balance.locationId),
  );
  const onHand = sumDecimals(internal.map((balance) => balance.onHand));
  const reserved = sumDecimals(internal.map((balance) => balance.reserved));
  return { onHand, reserved, available: subtractDecimal(onHand, reserved) };
}

function isLowStock(product: Product, stock: StockSummary): boolean {
  return compareDecimal(clampZero(stock.available), product.minimum) < 0;
}

function clampZero(value: string): string {
  return isNegativeDecimal(value) ? "0" : value;
}

function orgProducts(session: SessionContext): Product[] {
  return DEMO_DATASET.products.filter(
    (product) => product.organizationId === session.organization.id,
  );
}

export function listCategories(session: SessionContext): ProductCategory[] {
  return DEMO_DATASET.categories
    .filter((category) => category.organizationId === session.organization.id)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function categoryName(categoryId: string): string {
  return (
    DEMO_DATASET.categories.find((category) => category.id === categoryId)?.name ?? "Uncategorized"
  );
}

function toListRow(product: Product, canSeeStock: boolean): ProductListRow {
  const stock = summarizeStock(product);
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    categoryName: categoryName(product.categoryId),
    type: product.type,
    uom: product.uom.code,
    onHand: canSeeStock ? stock.onHand : null,
    reserved: canSeeStock ? stock.reserved : null,
    available: canSeeStock ? stock.available : null,
    minimum: canSeeStock ? product.minimum : null,
    isLowStock: canSeeStock && product.isActive ? isLowStock(product, stock) : null,
    isActive: product.isActive,
  };
}

function groupKey(row: ProductListRow, group: ProductGroupField): string {
  return group === "category" ? row.categoryName : PRODUCT_TYPE_LABELS[row.type];
}

const textCompare = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });

export function listProducts(
  session: SessionContext,
  query: ProductListQuery,
): PageResult<ProductListRow> {
  if (!hasPermission(session, "products:read")) {
    return { rows: [], total: 0, page: 1, size: query.size, groupCounts: null };
  }
  const canSeeStock = hasPermission(session, "stock:read");
  const filters = new Set(
    query.filters.filter((filter) => canSeeStock || !STOCK_FILTERS.has(filter)),
  );
  const term = query.q.toLowerCase();
  const updatedById = new Map(
    orgProducts(session).map((product) => [product.id, product.updatedAt]),
  );

  let rows = orgProducts(session)
    .filter((product) => (filters.has("archived") ? !product.isActive : product.isActive))
    .filter((product) => !query.facets.category || product.categoryId === query.facets.category)
    .filter(
      (product) =>
        !term ||
        product.sku.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term) ||
        product.barcode === term,
    )
    .map((product) => toListRow(product, canSeeStock));

  if (filters.has("low_stock")) rows = rows.filter((row) => row.isLowStock === true);
  if (filters.has("out_of_stock")) {
    rows = rows.filter(
      (row) => row.available !== null && compareDecimal(clampZero(row.available), "0") === 0,
    );
  }

  const direction = query.sort.direction === "asc" ? 1 : -1;
  const quantity = (value: string | null) => clampZero(value ?? "0");
  const compareRows = (a: ProductListRow, b: ProductListRow): number => {
    switch (query.sort.field) {
      case "sku":
        return textCompare(a.sku, b.sku);
      case "category":
        return textCompare(a.categoryName, b.categoryName) || textCompare(a.name, b.name);
      case "type":
        return textCompare(a.type, b.type) || textCompare(a.name, b.name);
      case "on_hand":
        return canSeeStock
          ? compareDecimal(quantity(a.onHand), quantity(b.onHand))
          : textCompare(a.name, b.name);
      case "reserved":
        return canSeeStock
          ? compareDecimal(quantity(a.reserved), quantity(b.reserved))
          : textCompare(a.name, b.name);
      case "available":
        return canSeeStock
          ? compareDecimal(quantity(a.available), quantity(b.available))
          : textCompare(a.name, b.name);
      case "minimum":
        return canSeeStock
          ? compareDecimal(quantity(a.minimum), quantity(b.minimum))
          : textCompare(a.name, b.name);
      case "updated":
        return (updatedById.get(a.id) ?? "").localeCompare(updatedById.get(b.id) ?? "");
      case "name":
        return textCompare(a.name, b.name);
    }
  };

  const group = query.group;
  rows.sort((a, b) => {
    if (group) {
      const byGroup = textCompare(groupKey(a, group), groupKey(b, group));
      if (byGroup !== 0) return byGroup;
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
  };
}

export interface ProductDetail {
  product: Product;
  categoryName: string;
  stock: StockSummary | null;
  isLowStock: boolean | null;
  locations: Array<{
    locationId: string;
    name: string;
    type: string;
    onHand: string;
    reserved: string;
  }> | null;
}

export function getProduct(session: SessionContext, productId: string): ProductDetail | null {
  if (!hasPermission(session, "products:read")) return null;
  const product = orgProducts(session).find((item) => item.id === productId);
  if (!product) return null;
  const canSeeStock = hasPermission(session, "stock:read");
  const stock = canSeeStock ? summarizeStock(product) : null;
  return {
    product,
    categoryName: categoryName(product.categoryId),
    stock,
    isLowStock: stock && product.isActive ? isLowStock(product, stock) : null,
    locations: canSeeStock
      ? product.balances.map((balance) => {
          const location = STOCK_LOCATIONS.find((item) => item.id === balance.locationId);
          return {
            locationId: balance.locationId,
            name: location?.fullName ?? balance.locationId,
            type: location?.type ?? "internal",
            onHand: balance.onHand,
            reserved: balance.reserved,
          };
        })
      : null,
  };
}

/** Movements derived from posted demo releases and receipts for this product. */
export function listProductMovements(
  session: SessionContext,
  productId: string,
): ProductMovement[] {
  if (!hasPermission(session, "stock:read")) return [];
  const movements: ProductMovement[] = [];
  for (const request of DEMO_DATASET.requests) {
    if (request.organizationId !== session.organization.id) continue;
    const line = request.lines.find((item) => item.productId === productId);
    if (!line) continue;
    for (const document of request.documents) {
      const quantity = document.quantities[line.id];
      if (!quantity || quantity === "0") continue;
      movements.push({
        id: `${document.id}-${line.id}`,
        date: document.date,
        reference: document.reference,
        requestId: request.id,
        from: document.from,
        to:
          document.kind === "receipt"
            ? buildingReceivingLocation(request.buildingId).fullName
            : document.to,
        quantity,
        uom: line.uom,
      });
    }
  }
  return movements.sort((a, b) => b.date.localeCompare(a.date));
}

export function countProductRequests(session: SessionContext, productId: string): number {
  return DEMO_DATASET.requests.filter(
    (request) =>
      request.organizationId === session.organization.id &&
      (session.buildingScope === null || session.buildingScope.includes(request.buildingId)) &&
      request.lines.some((line) => line.productId === productId),
  ).length;
}

export function searchProducts(
  session: SessionContext,
  term: string,
  limit = 6,
): Array<{ id: string; sku: string; name: string }> {
  if (!hasPermission(session, "products:read")) return [];
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  return orgProducts(session)
    .filter(
      (product) =>
        product.isActive &&
        (product.sku.toLowerCase().includes(needle) ||
          product.name.toLowerCase().includes(needle) ||
          product.barcode === needle),
    )
    .slice(0, limit)
    .map((product) => ({ id: product.id, sku: product.sku, name: product.name }));
}

export function listProductOptions(session: SessionContext): ProductOption[] {
  if (!hasPermission(session, "products:read")) return [];
  const canSeeStock = hasPermission(session, "stock:read");
  return orgProducts(session)
    .filter((product) => product.isActive)
    .sort((a, b) => textCompare(a.name, b.name))
    .map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      uom: product.uom.code,
      precision: product.uom.precision,
      available: canSeeStock ? clampZero(summarizeStock(product).available) : null,
    }));
}

/** Trusted precision lookup for server-side validation (active products only). */
export function productPrecisionLookup(
  session: SessionContext,
): (productId: string) => number | undefined {
  const precisions = new Map(
    orgProducts(session)
      .filter((product) => product.isActive)
      .map((product) => [product.id, product.uom.precision]),
  );
  return (productId) => precisions.get(productId);
}

export function listLowStockProducts(session: SessionContext, limit = 8): ProductListRow[] {
  if (!hasPermission(session, "stock:read")) return [];
  return orgProducts(session)
    .filter((product) => product.isActive)
    .map((product) => toListRow(product, true))
    .filter((row) => row.isLowStock)
    .sort((a, b) => compareDecimal(clampZero(a.available ?? "0"), clampZero(b.available ?? "0")))
    .slice(0, limit);
}

export function countLowStockProducts(session: SessionContext): number {
  if (!hasPermission(session, "stock:read")) return 0;
  return orgProducts(session).filter((product) => {
    if (!product.isActive) return false;
    return isLowStock(product, summarizeStock(product));
  }).length;
}

/** Re-exported for pages that label the stock scope. */
export function warehouseScopeLabel(session: SessionContext): string {
  const code = STOCK_LOCATIONS.find(
    (location) =>
      location.organizationId === session.organization.id && location.type === "internal",
  )?.fullName.split("/")[0];
  return code ? `${code}/Stock` : "warehouse stock";
}
