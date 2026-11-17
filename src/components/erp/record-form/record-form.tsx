import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface RecordFormProps {
  /** Save/Discard (editable drafts) and workflow command buttons. */
  actions?: ReactNode;
  /** RecordStatusBar for the document. */
  statusBar?: ReactNode;
  /** Prominent title (reference or name). */
  title: ReactNode;
  /** Context line: organization, building, warehouse… */
  context?: ReactNode;
  /** Badges next to the title. */
  badges?: ReactNode;
  /** Related-record smart buttons. */
  smartButtons?: ReactNode;
  /** Explains why the record can't be edited (posted/completed/role). */
  readOnlyReason?: string;
  /** Inline notices (demo notes, warnings). */
  notice?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * RecordForm (UI-003, spec §4.2): full-page document layout with an action
 * bar, status bar, title block, smart buttons, field groups and notebook tabs.
 * Purely presentational — form state lives in the feature (React Hook Form).
 */
export function RecordForm({
  actions,
  statusBar,
  title,
  context,
  badges,
  smartButtons,
  readOnlyReason,
  notice,
  children,
  className,
}: RecordFormProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      {actions || statusBar ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-erp-surface-muted/50 px-3 py-2 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
          {statusBar ? <div className="min-w-0">{statusBar}</div> : null}
        </div>
      ) : null}
      {readOnlyReason ? (
        <p className="flex items-center gap-2 border-b bg-erp-surface-muted/40 px-4 py-2 text-sm text-erp-text-subtle">
          <Lock aria-hidden className="size-3.5" />
          {readOnlyReason}
        </p>
      ) : null}
      <div className="flex flex-col gap-5 p-4 sm:p-6">
        {notice}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-erp-text sm:text-2xl">
                {title}
              </h2>
              {badges}
            </div>
            {context ? <div className="mt-1 text-sm text-erp-text-muted">{context}</div> : null}
          </div>
          {smartButtons ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Related records">
              {smartButtons}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Two-column field layout at ≥1280px, single column below (spec §3.2). */
export function RecordFieldGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-x-10 gap-y-4 xl:grid-cols-2", className)}>{children}</div>;
}

/** Labelled read-only value, laid out like an editable field. */
export function ReadOnlyField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:items-baseline sm:gap-3">
      <dt className="text-[13px] font-medium text-erp-text-subtle">{label}</dt>
      <dd className="min-w-0 text-sm text-erp-text">{children}</dd>
    </div>
  );
}

export function ReadOnlyFieldList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn("flex flex-col gap-3", className)}>{children}</dl>;
}
