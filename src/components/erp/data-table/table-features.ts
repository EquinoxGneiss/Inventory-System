import {
  columnVisibilityFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";

/**
 * Table features shared by every ERP list (TanStack Table v9 registers
 * features explicitly). Sorting and pagination are server-owned: the table
 * runs with `manualSorting` and renders the page it is given.
 */
export const erpTableFeatures = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
});

export type ERPTableFeatures = typeof erpTableFeatures;

/**
 * Column definition type for ERP lists. Mirrors TanStack's own
 * `ColumnHelper.columns()` return type, which erases the per-column value type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ERPColumnDef<TData extends RowData> = ColumnDef<ERPTableFeatures, TData, any>;

declare module "@tanstack/table-core" {
  // Declaration merging requires the exact generic signature of the original.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures, TData, TValue> {
    /** Right-align numeric quantities (spec §10.2). */
    align?: "left" | "right";
    /** Human label for the column selector and mobile cards. */
    label?: string;
    /** Column can be hidden from the column selector (default true). */
    hideable?: boolean;
    /** Hidden by default until the user enables it. */
    defaultHidden?: boolean;
    /** Extra classes for header and body cells. */
    className?: string;
  }
}
