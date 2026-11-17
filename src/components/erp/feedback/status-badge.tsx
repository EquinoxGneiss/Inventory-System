import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/status-tone";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-erp-surface-muted text-erp-text-subtle ring-erp-border",
  info: "bg-erp-info-tint text-erp-info ring-erp-info/20",
  warning: "bg-erp-warning-tint text-erp-warning ring-erp-warning/25",
  success: "bg-erp-success-tint text-erp-success ring-erp-success/20",
  transit: "bg-erp-brand-tint text-erp-brand ring-erp-brand/20",
  danger: "bg-erp-danger-tint text-erp-danger ring-erp-danger/20",
  muted: "bg-erp-surface-muted text-erp-text-subtle ring-erp-border",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-erp-text-subtle",
  info: "bg-erp-info",
  warning: "bg-erp-warning",
  success: "bg-erp-success",
  transit: "bg-erp-brand",
  danger: "bg-erp-danger",
  muted: "bg-erp-border-strong",
};

export interface StatusBadgeProps {
  label: string;
  tone: StatusTone;
  /** Optional visually hidden prefix for screen readers, e.g. "Status". */
  srPrefix?: string;
  className?: string;
}

/** Status pill. Always shows a text label — color is never the only cue (spec §8.5). */
export function StatusBadge({ label, tone, srPrefix, className }: StatusBadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT_CLASSES[tone])} />
      {srPrefix ? <span className="sr-only">{srPrefix}: </span> : null}
      {label}
    </span>
  );
}
