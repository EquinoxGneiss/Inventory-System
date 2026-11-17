import { formatDateTime } from "@/lib/format";

export interface TimelineEvent {
  id: string;
  at: string;
  actorName: string;
  summary: string;
  note?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Timestamped, actor-tagged activity history (spec §4.2 #8, §10.3). Newest first. */
export function ActivityTimeline({
  events,
  emptyText = "No activity yet.",
}: {
  events: TimelineEvent[];
  emptyText?: string;
}) {
  if (events.length === 0) return <p className="text-sm text-erp-text-muted">{emptyText}</p>;
  const ordered = [...events].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <ol className="relative flex flex-col gap-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
      {ordered.map((event) => (
        <li key={event.id} className="relative flex gap-3">
          <span
            aria-hidden
            className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-[11px] font-semibold text-erp-brand"
          >
            {initials(event.actorName)}
          </span>
          <div className="min-w-0 pt-1">
            <p className="text-sm">
              <span className="font-semibold text-erp-text">{event.actorName}</span>{" "}
              <span className="text-erp-text">
                {event.summary.charAt(0).toLowerCase() + event.summary.slice(1)}
              </span>
            </p>
            <p className="text-xs text-erp-text-muted">
              <time dateTime={event.at}>{formatDateTime(event.at)}</time>
            </p>
            {event.note ? (
              <p className="mt-1 rounded-md bg-erp-surface-muted px-2.5 py-1.5 text-sm text-erp-text-subtle">
                {event.note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
