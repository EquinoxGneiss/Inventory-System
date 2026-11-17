"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";
import { formatTick, niceScale } from "./scale";

export interface ChartSeries {
  key: string;
  label: string;
  /** Tailwind background class for the mark, e.g. "bg-erp-chart-focus". */
  markClass: string;
}

export interface ColumnSegment {
  series: string;
  value: number;
  /** Formatted value with unit, e.g. "64 ream". */
  display: string;
}

export interface ColumnDatum {
  key: string;
  /** Axis label (short). */
  label: string;
  /** Optional second axis line, e.g. "to date". */
  sublabel?: string;
  /** Tooltip / table heading. */
  longLabel: string;
  /** Stacked bottom → top. */
  segments: ColumnSegment[];
  /** Total shown in the tooltip when there is more than one segment. */
  totalDisplay?: string;
  /** Direct label above the column (use sparingly). */
  directLabel?: string;
}

export interface ReferenceLine {
  key: string;
  label: string;
  value: number;
  display: string;
  /** Tailwind background class for the line, e.g. "bg-erp-chart-reference". */
  lineClass: string;
}

/** References above this multiple of the tallest column are listed, not drawn. */
const OFF_SCALE_FACTOR = 2;

export interface ColumnChartProps {
  title: string;
  description?: string;
  data: ColumnDatum[];
  series: ChartSeries[];
  referenceLines?: ReferenceLine[];
  /** Header for the value columns of the table view, e.g. "Quantity (ream)". */
  valueHeader: string;
  /** Plot height in px; the axis band is added below, never inside. */
  plotHeight?: number;
}

/**
 * Column chart (dataviz spec): ≤24px bars with 4px rounded data-ends, square
 * baseline, 2px surface gap between stacked segments, solid hairline grid,
 * values in text tokens, hover + keyboard tooltip, and a table-view twin.
 * Built in HTML/CSS so it renders on the server and needs no measuring.
 */
export function ColumnChart({
  title,
  description,
  data,
  series,
  referenceLines = [],
  valueHeader,
  plotHeight = 220,
}: ColumnChartProps) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const seriesByKey = new Map(series.map((item) => [item.key, item]));

  const totals = data.map((datum) =>
    datum.segments.reduce((sum, segment) => sum + segment.value, 0),
  );
  const maxTotal = Math.max(0, ...totals);
  // A reference far above the columns would flatten them; leave it off the plot
  // (the legend still carries its value).
  const isOffScale = (line: ReferenceLine) =>
    maxTotal > 0 && line.value > maxTotal * OFF_SCALE_FACTOR;
  const plottedLines = referenceLines.filter((line) => !isOffScale(line));
  const { top, ticks } = niceScale(Math.max(maxTotal, ...plottedLines.map((line) => line.value)));
  const pct = (value: number) => `${Math.min(100, (value / top) * 100)}%`;
  const activeDatum = active !== null ? data[active] : undefined;

  return (
    <figure aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <figcaption className="flex flex-col gap-1">
        <span id={`${id}-title`} className="text-[15px] font-semibold text-erp-text">
          {title}
        </span>
        {description ? <span className="text-xs text-erp-text-muted">{description}</span> : null}
      </figcaption>

      <ul
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-erp-text-subtle"
        aria-label="Legend"
      >
        {series.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-[2px]", item.markClass)} />
            {item.label}
          </li>
        ))}
        {referenceLines.map((line) => (
          <li key={line.key} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("h-0.5 w-3.5 rounded-full", line.lineClass)} />
            {line.label} · <span className="font-semibold text-erp-text">{line.display}</span>
            {isOffScale(line) ? (
              <span className="text-erp-text-muted">(above chart range)</span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        {/* Y axis */}
        <div className="relative w-10" style={{ height: plotHeight }} aria-hidden>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2 text-[11px] text-erp-text-muted tabular-nums"
              style={{ bottom: pct(tick) }}
            >
              {formatTick(tick, top)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative" style={{ height: plotHeight }}>
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className={cn(
                "absolute inset-x-0 h-px",
                tick === 0 ? "bg-erp-chart-axis" : "bg-erp-chart-grid",
              )}
              style={{ bottom: pct(tick) }}
            />
          ))}

          <div className="absolute inset-0 flex">
            {data.map((datum, index) => {
              const total = totals[index] ?? 0;
              const ariaLabel = [
                datum.longLabel,
                ...datum.segments.map(
                  (segment) =>
                    `${seriesByKey.get(segment.series)?.label ?? segment.series}: ${segment.display}`,
                ),
                datum.totalDisplay && datum.segments.length > 1
                  ? `Total: ${datum.totalDisplay}`
                  : null,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <div
                  key={datum.key}
                  role="img"
                  aria-label={ariaLabel}
                  tabIndex={0}
                  data-active={active === index}
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() =>
                    setActive((current) => (current === index ? null : current))
                  }
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive((current) => (current === index ? null : current))}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60 data-[active=true]:bg-erp-surface-muted/50"
                >
                  <div
                    className="relative flex w-[min(24px,55%)] flex-col-reverse gap-[2px]"
                    style={{ height: pct(total) }}
                  >
                    {datum.segments.map((segment, segmentIndex) => (
                      <div
                        key={segment.series}
                        className={cn(
                          seriesByKey.get(segment.series)?.markClass,
                          "w-full transition-[filter] group-data-[active=true]:brightness-110",
                          segmentIndex === datum.segments.length - 1 && "rounded-t-[4px]",
                        )}
                        style={{ flexGrow: total > 0 ? segment.value / total : 0, flexBasis: 0 }}
                      />
                    ))}
                    {datum.directLabel ? (
                      <span
                        className={cn(
                          "absolute bottom-full mb-1 text-xs font-semibold whitespace-nowrap text-erp-text",
                          index === data.length - 1
                            ? "right-0"
                            : index === 0
                              ? "left-0"
                              : "left-1/2 -translate-x-1/2",
                        )}
                      >
                        {datum.directLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {plottedLines.map((line) => (
            <div
              key={line.key}
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 h-0.5 translate-y-1/2",
                line.lineClass,
              )}
              style={{ bottom: pct(line.value) }}
            />
          ))}

          {activeDatum && active !== null ? (
            <div
              role="tooltip"
              className={cn(
                "pointer-events-none absolute z-10 w-max max-w-56 rounded-md border bg-popover px-3 py-2 text-xs shadow-md",
                active === 0
                  ? "translate-x-0"
                  : active === data.length - 1
                    ? "-translate-x-full"
                    : "-translate-x-1/2",
              )}
              style={{
                left: `${((active + (active === 0 ? 0 : active === data.length - 1 ? 1 : 0.5)) / data.length) * 100}%`,
                bottom: `calc(${pct(totals[active] ?? 0)} + 1.75rem)`,
              }}
            >
              <p className="mb-1 text-erp-text-muted">{activeDatum.longLabel}</p>
              <ul className="flex flex-col gap-0.5">
                {activeDatum.segments.map((segment) => (
                  <li key={segment.series} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        "h-0.5 w-3 rounded-full",
                        seriesByKey.get(segment.series)?.markClass,
                      )}
                    />
                    <span className="font-semibold text-erp-text tabular-nums">
                      {segment.display}
                    </span>
                    <span className="text-erp-text-subtle">
                      {seriesByKey.get(segment.series)?.label}
                    </span>
                  </li>
                ))}
                {activeDatum.totalDisplay && activeDatum.segments.length > 1 ? (
                  <li className="mt-0.5 border-t pt-0.5">
                    <span className="font-semibold text-erp-text tabular-nums">
                      {activeDatum.totalDisplay}
                    </span>{" "}
                    <span className="text-erp-text-subtle">total</span>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        {/* X axis */}
        <div aria-hidden />
        <div className="flex pt-1.5" aria-hidden>
          {data.map((datum) => (
            <div
              key={datum.key}
              className="flex-1 text-center text-[11px] leading-tight text-erp-text-muted"
            >
              <span className="block">{datum.label}</span>
              {datum.sublabel ? <span className="block">{datum.sublabel}</span> : null}
            </div>
          ))}
        </div>
      </div>

      <details className="text-sm">
        <summary className="w-fit cursor-pointer rounded text-erp-brand hover:underline">
          View as table
        </summary>
        <div className="mt-2 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="bg-erp-surface-muted text-xs text-erp-text-subtle">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold">
                  Month
                </th>
                {series.map((item) => (
                  <th key={item.key} scope="col" className="px-3 py-2 text-right font-semibold">
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((datum) => (
                <tr key={datum.key} className="border-t">
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">
                    {datum.longLabel}
                  </th>
                  {series.map((item) => (
                    <td key={item.key} className="px-3 py-1.5 text-right tabular-nums">
                      {datum.segments.find((segment) => segment.series === item.key)?.display ??
                        "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {referenceLines.length ? (
            <p className="border-t px-3 py-2 text-xs text-erp-text-subtle">
              {referenceLines.map((line) => `${line.label}: ${line.display}`).join(" · ")} ·{" "}
              {valueHeader}
            </p>
          ) : null}
        </div>
      </details>
    </figure>
  );
}
