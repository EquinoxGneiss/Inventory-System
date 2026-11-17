"use client";

import {
  useTable,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format";
import type { ListSort } from "@/lib/list-query/list-query";
import { cn } from "@/lib/utils";
import { rememberListQuery } from "./list-memory";
import { useListPreferences } from "./list-preferences";
import { useListState } from "./list-state";
import { DataTablePagination } from "./data-table-pagination";
import { erpTableFeatures, type ERPColumnDef } from "./table-features";

export interface ERPDataTableGrouping<TData extends RowData> {
  label: string;
  getKey: (row: TData) => string;
  counts: Record<string, number>;
}

export interface ERPDataTableProps<TData extends RowData> {
  /** Stable key for preferences (columns, density) and list memory. */
  listKey: string;
  /** Accessible name for the table. */
  caption: string;
  columns: ERPColumnDef<TData>[];
  data: TData[];
  total: number;
  page: number;
  size: number;
  sort: ListSort<string>;
  getRowId: (row: TData) => string;
  getRowHref: (row: TData) => string;
  /** Short label used in checkbox names, e.g. the reference or SKU. */
  getRowLabel: (row: TData) => string;
  /** Primary-column id whose cell links to the record. */
  primaryColumnId: string;
  grouping?: ERPDataTableGrouping<TData> | null;
  emptyState: ReactNode;
  /** Compact card for screens below 768px. */
  renderMobileCard: (row: TData) => ReactNode;
  /** Extra actions shown while rows are selected. */
  selectionActions?: (selectedIds: string[]) => ReactNode;
}

const STICKY_HEADER = "sticky top-0 z-10 bg-erp-surface-muted";

/**
 * ERPDataTable (UI-002): server-paged, server-sorted list with URL-backed
 * state, row selection, column visibility, density, grouping headers and a
 * mobile card layout. Business-agnostic; features supply columns and rows.
 */
export function ERPDataTable<TData extends RowData>({
  listKey,
  caption,
  columns,
  data,
  total,
  page,
  size,
  sort,
  getRowId,
  getRowHref,
  getRowLabel,
  primaryColumnId,
  grouping,
  emptyState,
  renderMobileCard,
  selectionActions,
}: ERPDataTableProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const { searchParams, isPending, update } = useListState();
  const { preferences } = useListPreferences(listKey);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Remember this list's query so record breadcrumbs can return to it.
  const search = searchParams.toString();
  useEffect(() => {
    rememberListQuery(pathname, search);
  }, [pathname, search]);

  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    for (const column of columns) {
      const id = column.id;
      if (!id) continue;
      const hidden = preferences.hiddenColumns
        ? preferences.hiddenColumns.includes(id)
        : Boolean(column.meta?.defaultHidden);
      if (hidden && column.meta?.hideable !== false) visibility[id] = false;
    }
    return visibility;
  }, [columns, preferences.hiddenColumns]);

  const sorting = useMemo<SortingState>(
    () => [{ id: sort.field, desc: sort.direction === "desc" }],
    [sort.direction, sort.field],
  );

  const table = useTable({
    features: erpTableFeatures,
    columns,
    data,
    getRowId: (row) => getRowId(row),
    manualSorting: true,
    enableSortingRemoval: false,
    enableMultiSort: false,
    state: { sorting, rowSelection, columnVisibility },
    onSortingChange: (updater: Updater<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      update({ sort: first ? `${first.desc ? "-" : ""}${first.id}` : null });
    },
    onRowSelectionChange: setRowSelection,
  });

  const selectedIds = Object.keys(rowSelection);
  const rowHeight = preferences.density === "normal" ? "h-11" : "h-10";
  const visibleColumnCount = table.getVisibleLeafColumns().length + 1;

  function onRowClick(event: MouseEvent<HTMLTableRowElement>, href: string) {
    const target = event.target as HTMLElement;
    if (target.closest("a,button,input,label,[role=checkbox]")) return;
    if (window.getSelection()?.toString()) return; // allow copying text
    router.push(href);
  }

  const rows = table.getRowModel().rows;

  return (
    <section
      aria-label={caption}
      className="flex flex-col overflow-hidden rounded-lg border bg-card"
    >
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b bg-erp-brand-tint px-3 py-2 text-sm">
          <span className="font-medium" role="status">
            Selected: {formatCount(selectedIds.length)}
          </span>
          {selectionActions?.(selectedIds)}
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
        </div>
      ) : null}

      {total === 0 ? (
        emptyState
      ) : (
        <>
          {/* Desktop/tablet table */}
          <div
            className={cn(
              "hidden max-h-[calc(100svh-17rem)] min-h-48 overflow-auto transition-opacity md:block",
              isPending && "opacity-60",
            )}
            aria-busy={isPending}
          >
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                {caption}, page {page}, {formatCount(total)} records. Column headers with buttons
                can be sorted.
              </caption>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b">
                    <th scope="col" className={cn(STICKY_HEADER, "w-10 px-3")}>
                      <Checkbox
                        aria-label="Select all rows on this page"
                        checked={
                          table.getIsAllPageRowsSelected()
                            ? true
                            : table.getIsSomePageRowsSelected()
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
                      />
                    </th>
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta;
                      const sorted = header.column.getIsSorted();
                      const canSort = header.column.getCanSort();
                      const toggle = header.column.getToggleSortingHandler();
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : undefined
                          }
                          className={cn(
                            STICKY_HEADER,
                            "h-10 px-3 text-left text-xs font-semibold whitespace-nowrap text-erp-text-subtle",
                            meta?.align === "right" && "text-right",
                            meta?.className,
                          )}
                        >
                          {header.isPlaceholder ? null : canSort && toggle ? (
                            <button
                              type="button"
                              onClick={toggle}
                              className={cn(
                                "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-erp-text focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                                meta?.align === "right" && "flex-row-reverse",
                              )}
                            >
                              <table.FlexRender header={header} />
                              {sorted === "asc" ? (
                                <ArrowUp aria-hidden className="size-3.5" />
                              ) : sorted === "desc" ? (
                                <ArrowDown aria-hidden className="size-3.5" />
                              ) : (
                                <ArrowUpDown aria-hidden className="size-3.5 opacity-40" />
                              )}
                            </button>
                          ) : (
                            <table.FlexRender header={header} />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const original = row.original;
                  const href = getRowHref(original);
                  const groupKey = grouping?.getKey(original);
                  const previous = index > 0 ? rows[index - 1] : undefined;
                  const showGroupHeader =
                    grouping &&
                    groupKey !== undefined &&
                    (!previous || grouping.getKey(previous.original) !== groupKey);
                  return (
                    <Fragment key={row.id}>
                      {showGroupHeader ? (
                        <tr className="border-b bg-erp-surface-muted/60">
                          <th
                            scope="colgroup"
                            colSpan={visibleColumnCount}
                            className="px-3 py-1.5 text-left text-xs font-semibold text-erp-text"
                          >
                            {grouping.label}: {groupKey}{" "}
                            <span className="font-normal text-erp-text-subtle">
                              ({formatCount(grouping.counts[groupKey] ?? 0)})
                            </span>
                          </th>
                        </tr>
                      ) : null}
                      <tr
                        data-state={row.getIsSelected() ? "selected" : undefined}
                        onClick={(event) => onRowClick(event, href)}
                        className={cn(
                          rowHeight,
                          "cursor-pointer border-b transition-colors last:border-b-0 hover:bg-erp-surface-muted/70 data-[state=selected]:bg-erp-brand-tint",
                        )}
                      >
                        <td className="w-10 px-3">
                          <Checkbox
                            aria-label={`Select ${getRowLabel(original)}`}
                            checked={row.getIsSelected()}
                            onCheckedChange={(value) => row.toggleSelected(value === true)}
                          />
                        </td>
                        {row.getVisibleCells().map((cell) => {
                          const meta = cell.column.columnDef.meta;
                          const isPrimary = cell.column.id === primaryColumnId;
                          return (
                            <td
                              key={cell.id}
                              className={cn(
                                "px-3 py-1 align-middle whitespace-nowrap",
                                meta?.align === "right" && "text-right tabular-nums",
                                meta?.className,
                              )}
                            >
                              {isPrimary ? (
                                <Link
                                  href={href}
                                  className="font-medium text-erp-text hover:underline"
                                >
                                  <table.FlexRender cell={cell} />
                                </Link>
                              ) : (
                                <table.FlexRender cell={cell} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className={cn("divide-y md:hidden", isPending && "opacity-60")} aria-busy={isPending}>
            {data.map((row) => (
              <li key={getRowId(row)}>
                <Link
                  href={getRowHref(row)}
                  className="block px-4 py-3 hover:bg-erp-surface-muted/70 focus-visible:bg-erp-surface-muted"
                >
                  {renderMobileCard(row)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <DataTablePagination page={page} size={size} total={total} />
    </section>
  );
}
