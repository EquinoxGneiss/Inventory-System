/**
 * Display formatting with explicit locale/timezone rules (UI/UX spec §10.5):
 * English (Philippines), Asia/Manila, unambiguous month names.
 */
export const APP_LOCALE = "en-PH";
export const APP_TIME_ZONE = "Asia/Manila";

const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const integerFormatter = new Intl.NumberFormat(APP_LOCALE);

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // Plain calendar dates (YYYY-MM-DD) are Manila business dates.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00+08:00`);
  return new Date(value);
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(toDate(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(toDate(value));
}

export function formatCount(value: number): string {
  return integerFormatter.format(value);
}

/**
 * Format a decimal-string quantity with thousands separators, without
 * converting to a float (no rounding surprises), optionally with its unit.
 */
export function formatQuantity(value: string, uom?: string): string {
  const [integerPart = "0", fractionPart] = value.split(".");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const number = fractionPart ? `${grouped}.${fractionPart}` : grouped;
  return uom ? `${number} ${uom}` : number;
}

/** Today's calendar date in Manila as YYYY-MM-DD. */
export function manilaToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}
