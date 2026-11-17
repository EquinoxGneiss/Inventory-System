import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Inline notice used to state plainly what the demo build does not do. */
export function DemoNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-erp-info/25 bg-erp-info-tint px-3 py-2 text-sm text-erp-text",
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-erp-info" />
      <div>{children}</div>
    </div>
  );
}
