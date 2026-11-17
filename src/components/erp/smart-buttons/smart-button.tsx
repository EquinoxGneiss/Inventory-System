import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface SmartButtonProps {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Destination for the related records. Without it the button is a static stat. */
  href?: string;
  /** Explains a non-navigable stat (e.g. "Movement history opens in Phase 4"). */
  note?: string;
  tone?: "default" | "warning";
}

/** Related-record smart button with a count (spec §4.2 #7). */
export function SmartButton({
  icon: Icon,
  label,
  value,
  href,
  note,
  tone = "default",
}: SmartButtonProps) {
  const body = (
    <>
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          tone === "warning" ? "text-erp-warning" : "text-erp-accent",
        )}
      />
      <span className="flex flex-col leading-tight">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            tone === "warning" ? "text-erp-warning" : "text-erp-text",
          )}
        >
          {value}
        </span>
        <span className="text-xs text-erp-text-muted">{label}</span>
      </span>
    </>
  );
  const className =
    "flex min-h-11 min-w-28 items-center gap-2.5 rounded-md border bg-card px-3 py-1.5 text-left";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(className, "transition-colors hover:border-erp-accent/50 hover:bg-accent")}
      >
        {body}
      </Link>
    );
  }
  return (
    <div className={className} title={note}>
      {body}
      {note ? <span className="sr-only">. {note}</span> : null}
    </div>
  );
}
