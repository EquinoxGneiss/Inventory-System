import { ColumnChart } from "@/components/erp/charts/column-chart";
import { StatusBadge } from "@/components/erp/feedback/status-badge";
import {
  ReadOnlyField,
  ReadOnlyFieldList,
  RecordFieldGrid,
} from "@/components/erp/record-form/record-form";
import { formatQuantity } from "@/lib/format";
import type { ProductForecast } from "../data/forecast-repository";
import {
  FORECAST_METHOD_TEXT,
  FORECAST_MONTH_LABEL,
  FORECAST_STATUS_META,
  formatCoverage,
} from "../domain/forecast";

const SERIES = [
  { key: "actual", label: "Actual use", markClass: "bg-erp-chart-context" },
  { key: "expected", label: "Expected use (Dec)", markClass: "bg-erp-chart-focus" },
  { key: "safety", label: "Safety stock", markClass: "bg-erp-chart-focus-light" },
];

/** Product Forecast tab: monthly usage vs next month's need, with the numbers behind it. */
export function ProductForecastPanel({ forecast }: { forecast: ProductForecast }) {
  const { row, history } = forecast;
  const unit = row.uom;
  const status = FORECAST_STATUS_META[row.status];
  const q = (value: string) => formatQuantity(value, unit);

  return (
    <div className="flex flex-col gap-5">
      <p className="flex flex-wrap items-center gap-2 text-sm text-erp-text">
        <span>
          {FORECAST_MONTH_LABEL} need: <strong>{q(row.need)}</strong> · Available now:{" "}
          <strong>{q(row.available)}</strong>
          {row.shortfall !== "0" ? (
            <>
              {" "}
              · Shortfall: <strong className="text-erp-danger">{q(row.shortfall)}</strong>
            </>
          ) : null}
        </span>
        <StatusBadge
          label={`${status.label} · ${formatCoverage(row.coveragePct)} covered`}
          tone={status.tone}
          srPrefix="Forecast"
        />
      </p>

      <ColumnChart
        title={`Monthly use and ${FORECAST_MONTH_LABEL} need (${unit})`}
        description="Gray columns are actual use (November so far). The December column stacks expected use and safety stock; its top is the stock needed."
        valueHeader={`Quantities in ${unit}`}
        series={SERIES}
        data={[
          ...history.map((point) => ({
            key: point.key,
            label: point.label,
            sublabel: point.partial ? "to date" : undefined,
            longLabel: point.partial ? `${point.longLabel} (to date)` : point.longLabel,
            segments: [
              { series: "actual", value: Number(point.quantity), display: q(point.quantity) },
            ],
          })),
          {
            key: "forecast",
            label: "Dec",
            sublabel: "forecast",
            longLabel: `${FORECAST_MONTH_LABEL} (forecast)`,
            segments: [
              { series: "expected", value: Number(row.expectedUse), display: q(row.expectedUse) },
              { series: "safety", value: Number(row.minimum), display: q(row.minimum) },
            ],
            totalDisplay: q(row.need),
            directLabel: `Need ${q(row.need)}`,
          },
        ]}
        referenceLines={[
          {
            key: "available",
            label: "Available now",
            value: Number(row.available),
            display: q(row.available),
            lineClass: "bg-erp-chart-reference",
          },
        ]}
      />

      <RecordFieldGrid>
        <ReadOnlyFieldList>
          <ReadOnlyField label="Forecast use">
            {q(row.usage)} (weighted 3-month average)
          </ReadOnlyField>
          <ReadOnlyField label="Already requested">{q(row.pending)} on open requests</ReadOnlyField>
          <ReadOnlyField label="Expected use">
            {q(row.expectedUse)} (the larger of the two)
          </ReadOnlyField>
          <ReadOnlyField label="Safety stock">{q(row.minimum)} (reorder minimum)</ReadOnlyField>
        </ReadOnlyFieldList>
        <ReadOnlyFieldList>
          <ReadOnlyField label="Need next month">
            <strong>{q(row.need)}</strong>
          </ReadOnlyField>
          <ReadOnlyField label="Available now">{q(row.available)}</ReadOnlyField>
          <ReadOnlyField label="Shortfall">
            {row.shortfall === "0" ? "None" : q(row.shortfall)}
          </ReadOnlyField>
          <ReadOnlyField label="Suggested order">
            {row.suggestedOrder === "0" ? "No order needed" : q(row.suggestedOrder)}
          </ReadOnlyField>
        </ReadOnlyFieldList>
      </RecordFieldGrid>
      <p className="text-xs text-erp-text-muted">
        {FORECAST_METHOD_TEXT} Demo usage history; real issued quantities come from the stock ledger
        in Phase 4.
      </p>
    </div>
  );
}
