import { createSeededRandom, hashSeed } from "@/lib/demo/seeded-random";
import { minorUnitsFromDecimal } from "@/lib/validation/quantity";
import { DEMO_DATASET } from "@/features/inventory/data/demo-dataset";
import type { Product } from "@/features/products/types";

/**
 * Synthetic monthly usage (quantity issued to buildings) for the demo
 * forecast. Deterministic per product and generated separately from the
 * request dataset, so existing demo invariants are untouched. Phase 4 replaces
 * this with real ledger history.
 */

export interface UsageMonth {
  /** YYYY-MM */
  key: string;
  /** Short axis label, e.g. "Oct". */
  label: string;
  /** Long label, e.g. "October 2026". */
  longLabel: string;
  /** True for the current month, which has only partial data. */
  partial: boolean;
}

/** Demo snapshot is 18 Nov 2026: November has 18 of 30 days of data. */
export const MONTH_TO_DATE_DAYS = 18;
export const MONTH_DAYS = 30;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function buildMonths(): UsageMonth[] {
  const months: UsageMonth[] = [];
  // Dec 2025 … Nov 2026
  for (let offset = 0; offset < 12; offset++) {
    const monthIndex = (11 + offset) % 12;
    const year = offset === 0 ? 2025 : 2026;
    const name = MONTH_NAMES[monthIndex]!;
    months.push({
      key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      label: name.slice(0, 3),
      longLabel: `${name} ${year}`,
      partial: offset === 11,
    });
  }
  return months;
}

export const USAGE_MONTHS: readonly UsageMonth[] = buildMonths();

/** Mild seasonal multipliers per catalog fragment, indexed by calendar month (0 = Jan). */
const SEASONALITY: Record<string, readonly number[]> = {
  janitorial: [1, 1, 1, 1, 1.05, 1.15, 1.2, 1.2, 1.15, 1.1, 1, 1],
  medical: [1, 1, 1, 1, 1, 1.05, 1.15, 1.2, 1.15, 1.05, 1, 1],
  ppe: [1, 1, 1, 1, 1, 1.05, 1.1, 1.1, 1.05, 1, 1, 0.9],
  office: [1.2, 1, 1, 1, 1, 1.15, 1, 1, 1, 1, 1, 0.85],
  pantry: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.05, 1.3],
};

function categoryKey(product: Product): string {
  return product.categoryId.split("-").at(-1) ?? "";
}

/** One whole unit in minor units. */
export function unitStep(precision: number): number {
  return 10 ** precision;
}

function generateUsage(product: Product): number[] {
  if (!product.isActive) return USAGE_MONTHS.map(() => 0);
  const random = createSeededRandom(hashSeed(`usage:${product.id}`));
  const step = unitStep(product.uom.precision);
  const minimum = minorUnitsFromDecimal(product.minimum, product.uom.precision);
  // The reorder minimum is roughly 2–6 weeks of use.
  const base = minimum * (0.6 + random.next() * 1.1);
  const trend = -0.01 + random.next() * 0.03; // per month
  const seasonality = SEASONALITY[categoryKey(product)];

  return USAGE_MONTHS.map((month, index) => {
    const calendarMonth = Number(month.key.slice(5)) - 1;
    const season = seasonality?.[calendarMonth] ?? 1;
    const noise = 0.8 + random.next() * 0.4;
    let value = base * season * (1 + trend * index) * noise;
    if (month.partial) value = (value * MONTH_TO_DATE_DAYS) / MONTH_DAYS;
    return Math.max(0, Math.round(value / step) * step);
  });
}

const HISTORY = new Map<string, number[]>(
  DEMO_DATASET.products.map((product) => [product.id, generateUsage(product)]),
);

/** Monthly usage in minor units aligned with USAGE_MONTHS (empty array if unknown). */
export function usageHistory(productId: string): readonly number[] {
  return HISTORY.get(productId) ?? [];
}
