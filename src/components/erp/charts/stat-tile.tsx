import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface StatTileProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: LucideIcon;
  /** Icon colour only; the label always carries the meaning. */
  tone?: "default" | "danger" | "warning" | "success";
}

const ICON_TONE = {
  default: "text-erp-accent",
  danger: "text-erp-danger",
  warning: "text-erp-warning",
  success: "text-erp-success",
} as const;

/**
 * Stat tile (dataviz figure contract): sentence-case label, a large value in
 * proportional figures, and an optional note.
 */
export function StatTile({ label, value, note, icon: Icon, tone = "default" }: StatTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-erp-text-subtle">{label}</p>
        {Icon ? <Icon aria-hidden className={cn("size-4", ICON_TONE[tone])} /> : null}
      </div>
      <p className="text-[28px] leading-none font-semibold tracking-tight text-erp-text">{value}</p>
      {note ? <p className="text-xs text-erp-text-muted">{note}</p> : null}
    </div>
  );
}
