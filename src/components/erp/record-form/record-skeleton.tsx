import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder for record pages. */
export function RecordSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading record">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-7 w-80" />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="h-7 w-96 max-w-[50%]" />
        </div>
        <div className="flex flex-col gap-5 p-6">
          <div className="flex justify-between gap-4">
            <Skeleton className="h-8 w-72" />
            <div className="flex gap-2">
              <Skeleton className="h-11 w-28" />
              <Skeleton className="h-11 w-28" />
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
