import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  /** Compact variant for use inside tabs and cards. */
  size?: "default" | "compact";
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
  size = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        size === "default" ? "px-6 py-14" : "px-4 py-8",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-erp-surface-muted text-erp-text-subtle">
        <Icon aria-hidden className="size-5" />
      </span>
      <p className="text-sm font-semibold text-erp-text">{title}</p>
      {description ? (
        <div className="max-w-md text-sm text-erp-text-muted">{description}</div>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
