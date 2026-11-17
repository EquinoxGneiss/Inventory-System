"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/list-query/list-query";
import { useListState } from "./list-state";

export function DataTablePagination({
  page,
  size,
  total,
}: {
  page: number;
  size: number;
  total: number;
}) {
  const { update, isPending } = useListState();
  const lastPage = Math.max(1, Math.ceil(total / size));
  const first = total === 0 ? 0 : (page - 1) * size + 1;
  const last = Math.min(total, page * size);

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t px-3 py-2 text-sm">
      <div className="flex items-center gap-2 text-erp-text-muted">
        <label htmlFor="page-size" className="whitespace-nowrap">
          Rows per page
        </label>
        <Select
          value={String(size)}
          onValueChange={(value) =>
            update({ size: Number(value) === DEFAULT_PAGE_SIZE ? null : value })
          }
        >
          <SelectTrigger id="page-size" size="sm" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="tabular-nums" aria-live="polite">
        {formatCount(first)}–{formatCount(last)} of {formatCount(total)}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={page <= 1 || isPending}
          onClick={() =>
            update({ page: page - 1 <= 1 ? null : String(page - 1) }, { resetPage: false })
          }
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={page >= lastPage || isPending}
          onClick={() => update({ page: String(page + 1) }, { resetPage: false })}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
