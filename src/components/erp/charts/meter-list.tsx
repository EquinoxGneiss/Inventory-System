import Link from "next/link";

import { StatusBadge } from "@/components/erp/feedback/status-badge";
import type { StatusTone } from "@/lib/status-tone";
import { cn } from "@/lib/utils";

export interface MeterRow {
  id: string;
  label: string;
  sublabel?: string;
  href?: string;
  /** Filled share of the track; values above 1 render as a full track. */
  ratio: number;
  /** The figure the reader needs, e.g. "40% covered · need 300 ream · have 120 ream". */
  figure: string;
  status: { label: string; tone: StatusTone };
}

const FILL: Partial<Record<StatusTone, string>> = {
  danger: "bg-erp-danger",
  warning: "bg-erp-warning",
  success: "bg-erp-success",
};

const TRACK: Partial<Record<StatusTone, string>> = {
  danger: "bg-erp-danger-tint",
  warning: "bg-erp-warning-tint",
  success: "bg-erp-success-tint",
};

/**
 * Meter list (dataviz: several ratios, one per named row, each against its own
 * whole). Bars align across rows; the fill carries severity, the track is a
 * lighter step of the same ramp, and the text carries every value.
 */
export function MeterList({ rows, label }: { rows: MeterRow[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col divide-y">
      {rows.map((row) => (
        <li
          key={row.id}
          className="grid gap-x-4 gap-y-1.5 py-2.5 sm:grid-cols-[minmax(0,16rem)_minmax(6rem,1fr)_auto] sm:items-center"
        >
          <div className="min-w-0">
            {row.href ? (
              <Link
                href={row.href}
                className="block truncate text-sm font-medium text-erp-text hover:underline"
              >
                {row.label}
              </Link>
            ) : (
              <span className="block truncate text-sm font-medium text-erp-text">{row.label}</span>
            )}
            {row.sublabel ? (
              <span className="block truncate text-xs text-erp-text-muted">{row.sublabel}</span>
            ) : null}
          </div>
          <div
            aria-hidden
            className={cn(
              "h-2 overflow-hidden rounded-full",
              TRACK[row.status.tone] ?? "bg-erp-surface-muted",
            )}
          >
            <div
              className={cn("h-full rounded-full", FILL[row.status.tone] ?? "bg-erp-chart-focus")}
              style={{ width: `${Math.max(0, Math.min(1, row.ratio)) * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <span className="text-xs text-erp-text-subtle tabular-nums">{row.figure}</span>
            <StatusBadge label={row.status.label} tone={row.status.tone} />
          </div>
        </li>
      ))}
    </ul>
  );
}
