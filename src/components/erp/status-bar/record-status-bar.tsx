import { Check } from "lucide-react";

import { StatusBadge } from "@/components/erp/feedback/status-badge";
import type { StatusTone } from "@/lib/status-tone";
import { cn } from "@/lib/utils";

export interface StatusStage {
  key: string;
  label: string;
}

export interface RecordStatusBarProps {
  stages: readonly StatusStage[];
  /** Key of the stage the document is at; `null` when it left the main flow. */
  current: string | null;
  /** Branch state shown next to the stages (e.g. Rejected, Waiting for Stock). */
  exception?: { label: string; tone: StatusTone } | null;
  label?: string;
}

/**
 * RecordStatusBar (UI-004, spec §4.2 #3): ordered workflow stages with past,
 * current and future states. Business-agnostic — the feature maps its status
 * model onto stages and supplies the allowed commands separately.
 */
export function RecordStatusBar({
  stages,
  current,
  exception,
  label = "Document status",
}: RecordStatusBarProps) {
  const currentIndex = current ? stages.findIndex((stage) => stage.key === current) : -1;
  const currentStage = currentIndex >= 0 ? stages[currentIndex] : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label={label}>
        {/* Full stage strip on wider screens */}
        <ol className="hidden items-center lg:flex">
          {stages.map((stage, index) => {
            const state =
              index < currentIndex ? "past" : index === currentIndex ? "current" : "future";
            return (
              <li
                key={stage.key}
                aria-current={state === "current" ? "step" : undefined}
                data-state={state}
                className={cn(
                  "relative flex h-7 items-center gap-1 pr-3 pl-4 text-xs font-medium whitespace-nowrap first:rounded-l-md first:pl-3 last:rounded-r-md",
                  "[clip-path:polygon(0_0,calc(100%-8px)_0,100%_50%,calc(100%-8px)_100%,0_100%,8px_50%)] first:[clip-path:polygon(0_0,calc(100%-8px)_0,100%_50%,calc(100%-8px)_100%,0_100%)] last:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%,8px_50%)]",
                  "-ml-1 first:ml-0",
                  state === "current" && "bg-erp-brand text-white",
                  state === "past" && "bg-erp-brand-tint text-erp-brand",
                  state === "future" && "bg-erp-surface-muted text-erp-text-subtle",
                )}
              >
                {state === "past" ? <Check aria-hidden className="size-3" /> : null}
                {stage.label}
                <span className="sr-only">
                  {state === "past" ? " (completed)" : state === "current" ? " (current)" : ""}
                </span>
              </li>
            );
          })}
        </ol>
        {/* Compact summary below 1024px */}
        <p className="text-sm text-erp-text-subtle lg:hidden">
          {currentStage ? (
            <>
              Stage {currentIndex + 1} of {stages.length}:{" "}
              <span className="font-semibold text-erp-text">{currentStage.label}</span>
            </>
          ) : (
            "Outside the standard flow"
          )}
        </p>
      </nav>
      {exception ? (
        <StatusBadge label={exception.label} tone={exception.tone} srPrefix="Status" />
      ) : null}
    </div>
  );
}
