import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface OperationCardProps {
  title: string;
  count: number;
  description: string;
  href: string;
  icon: LucideIcon;
  tone?: "default" | "attention" | "critical";
}

/** Task card for things requiring attention (spec §5.1, §9 OperationCard). */
export function OperationCard({
  title,
  count,
  description,
  href,
  icon: Icon,
  tone = "default",
}: OperationCardProps) {
  const emphasize = count > 0 && tone !== "default";
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-erp-accent/50 hover:bg-accent/40",
        emphasize && tone === "attention" && "border-l-4 border-l-erp-warning",
        emphasize && tone === "critical" && "border-l-4 border-l-erp-danger",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-erp-text">{title}</h2>
        <Icon aria-hidden className="size-4 text-erp-accent" />
      </div>
      <p className="text-[28px] leading-none font-semibold tracking-tight text-erp-text tabular-nums">
        {formatCount(count)}
        <span className="sr-only"> {title.toLowerCase()}</span>
      </p>
      <p className="flex items-center justify-between gap-2 text-xs text-erp-text-muted">
        <span>{description}</span>
        <ArrowRight
          aria-hidden
          className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </p>
    </Link>
  );
}
