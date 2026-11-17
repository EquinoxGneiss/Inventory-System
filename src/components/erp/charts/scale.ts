/**
 * "Nice" linear axis: clean tick steps of 1, 2 or 5 × 10ⁿ starting at zero,
 * with the top tick at or above the largest value.
 */
export function niceScale(maxValue: number, targetTicks = 4): { top: number; ticks: number[] } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return { top: 1, ticks: [0, 1] };
  const magnitude = 10 ** Math.floor(Math.log10(maxValue / targetTicks));
  // Pick the 1/2/5 step whose interval count lands closest to the target (ties → finer).
  let step = magnitude;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const multiplier of [1, 2, 5, 10]) {
    const candidate = multiplier * magnitude;
    const distance = Math.abs(Math.ceil(maxValue / candidate) - targetTicks);
    if (distance < bestDistance) {
      bestDistance = distance;
      step = candidate;
    }
  }
  const top = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 2; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }
  return { top, ticks };
}

const fullFormatter = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 });
const compactFormatter = new Intl.NumberFormat("en-PH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Axis tick label: in full under 10,000, compact on an axis that reaches it. */
export function formatTick(value: number, axisTop: number): string {
  return axisTop >= 10_000 ? compactFormatter.format(value) : fullFormatter.format(value);
}
