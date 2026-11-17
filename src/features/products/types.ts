export const PRODUCT_TYPES = ["stockable", "consumable"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  stockable: "Stockable",
  consumable: "Consumable",
};

export interface UnitOfMeasure {
  code: string;
  name: string;
  /** Allowed decimal places for quantities in this unit. */
  precision: number;
}

export interface ProductCategory {
  id: string;
  organizationId: string;
  name: string;
}

export interface LocationBalance {
  locationId: string;
  /** Decimal string. */
  onHand: string;
  /** Decimal string. */
  reserved: string;
}

export interface Product {
  id: string;
  organizationId: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  type: ProductType;
  uom: UnitOfMeasure;
  /** Reorder threshold (decimal string). */
  minimum: string;
  isActive: boolean;
  updatedAt: string;
  /** Balances at internal warehouse locations and the transit location. */
  balances: LocationBalance[];
}

/** List-row projection. Quantity fields are `null` when the viewer lacks `stock:read`. */
export interface ProductListRow {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  type: ProductType;
  uom: string;
  onHand: string | null;
  reserved: string | null;
  available: string | null;
  minimum: string | null;
  isLowStock: boolean | null;
  isActive: boolean;
}

export interface ProductOption {
  id: string;
  sku: string;
  name: string;
  uom: string;
  precision: number;
  /** Available quantity, or null when the viewer can't see stock. */
  available: string | null;
}

export interface ProductMovement {
  id: string;
  date: string;
  reference: string;
  requestId: string;
  from: string;
  to: string;
  quantity: string;
  uom: string;
}
