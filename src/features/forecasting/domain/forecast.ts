import type { StatusTone } from "@/lib/status-tone";

/**
 * "Stock needed next month" forecast (demo heuristic, docs/open-decisions.md #13).
 *
 * Deliberately simple and explainable. All quantities are integer minor units
 * (10^-precision of the product's unit) so no floating-point quantities are
 * ever produced; callers convert back with `decimalFromMinorUnits`.
 */

export const FORECAST_MONTH = "2026-12";
export const FORECAST_MONTH_LABEL = "December 2026";

/** Weights for the last three complete months, oldest → newest. */
export const MOVING_AVERAGE_WEIGHTS = [1, 2, 3] as const;

export const FORECAST_METHOD_TEXT =
  "Forecast use is a weighted average of the last three complete months (Aug 17%, Sep 33%, Oct 50%). " +
  "Need = the larger of forecast use and already-requested quantities, plus the reorder minimum as safety stock. " +
  "Shortfall = need minus stock available now.";

export const FORECAST_STATUSES = ["short", "at_risk", "covered"] as const;
export type ForecastStatus = (typeof FORECAST_STATUSES)[number];

export const FORECAST_STATUS_META: Record<
  ForecastStatus,
  { label: string; tone: StatusTone; description: string }
> = {
  short: {
    label: "Short",
    tone: "danger",
    description: "Available stock covers less than the need",
  },
  at_risk: {
    label: "At risk",
    tone: "warning",
    description: "Covered, but with under 25% headroom",
  },
  covered: {
    label: "Covered",
    tone: "success",
    description: "At least 125% of the need is available",
  },
};

/** Coverage thresholds in whole percent. */
export const AT_RISK_FROM = 100;
export const COVERED_FROM = 125;

/** Round a minor-unit quantity up to the unit's step (whole units for precision 0). */
export function roundUpToStep(value: number, step: number): number {
  if (value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

/**
 * Weighted moving average over the trailing values, rounded up to the step.
 * `history` is oldest → newest; only the last `weights.length` entries count.
 */
export function weightedMovingAverage(
  history: readonly number[],
  step: number,
  weights: readonly number[] = MOVING_AVERAGE_WEIGHTS,
): number {
  const window = history.slice(-weights.length);
  if (window.length === 0) return 0;
  const usedWeights = weights.slice(weights.length - window.length);
  const weightTotal = usedWeights.reduce((sum, weight) => sum + weight, 0);
  const weighted = window.reduce((sum, value, index) => sum + value * (usedWeights[index] ?? 0), 0);
  return roundUpToStep(weighted / weightTotal, step);
}

/** Coverage for display; very large values are capped so they stay readable. */
export function formatCoverage(coveragePct: number): string {
  return coveragePct > 500 ? "500%+" : `${coveragePct}%`;
}

export function statusForCoverage(coveragePct: number): ForecastStatus {
  if (coveragePct < AT_RISK_FROM) return "short";
  if (coveragePct < COVERED_FROM) return "at_risk";
  return "covered";
}

export interface ForecastInputs {
  /** Complete months of issued quantity, oldest → newest (minor units). */
  completeMonths: readonly number[];
  /** Quantity on open, not-yet-reserved requests (minor units). */
  pending: number;
  /** Reorder minimum used as safety stock (minor units). */
  minimum: number;
  /** Stock available now (minor units, ≥ 0). */
  available: number;
  /** One unit step in minor units (1 for whole-number units). */
  step: number;
}

export interface ForecastResult {
  usage: number;
  pending: number;
  /** max(usage, pending): what the buildings are expected to draw next month. */
  expectedUse: number;
  minimum: number;
  need: number;
  available: number;
  shortfall: number;
  /** Whole percent of the need covered by available stock. */
  coveragePct: number;
  status: ForecastStatus;
  suggestedOrder: number;
}

export function computeForecast(inputs: ForecastInputs): ForecastResult {
  const usage = weightedMovingAverage(inputs.completeMonths, inputs.step);
  const available = Math.max(0, inputs.available);
  const expectedUse = Math.max(usage, inputs.pending);
  const need = expectedUse + inputs.minimum;
  const shortfall = Math.max(0, need - available);
  const coveragePct = need === 0 ? 100 : Math.floor((available * 100) / need);
  return {
    usage,
    pending: inputs.pending,
    expectedUse,
    minimum: inputs.minimum,
    need,
    available,
    shortfall,
    coveragePct,
    status: statusForCoverage(coveragePct),
    suggestedOrder: roundUpToStep(shortfall, inputs.step),
  };
}
