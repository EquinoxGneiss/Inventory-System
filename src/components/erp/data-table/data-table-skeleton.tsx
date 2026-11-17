import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder matching the control panel + table layout. */
export function DataTableSkeleton({ rows = 10, columns = 7 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading list">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="ml-auto h-9 w-full max-w-md" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex h-10 items-center gap-6 border-b bg-erp-surface-muted px-4">
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton key={index} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex h-10 items-center gap-6 border-b px-4 last:border-b-0">
            {Array.from({ length: columns }, (_, column) => (
              <Skeleton
                key={column}
                className="h-3"
                style={{ width: 40 + ((row + column) % 4) * 24 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
