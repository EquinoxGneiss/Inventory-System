/**
 * Decimal-string quantity helpers. Quantities travel between layers as strings
 * (PostgreSQL `numeric` in later phases) so validation never depends on
 * floating-point arithmetic.
 */

const DECIMAL_PATTERN = /^(\d+)(?:\.(\d+))?$/;
export const MAX_INTEGER_DIGITS = 12;

export type QuantityIssue = "invalid" | "not_positive" | "too_precise" | "too_large";

interface ParsedDecimal {
  integer: string;
  fraction: string;
}

function parseDecimal(value: string): ParsedDecimal | null {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) return null;
  const integer = (match[1] ?? "0").replace(/^0+(?=\d)/, "");
  const fraction = (match[2] ?? "").replace(/0+$/, "");
  return { integer, fraction };
}

/** Number of significant decimal places (trailing zeros ignored). */
export function decimalPlaces(value: string): number {
  return parseDecimal(value)?.fraction.length ?? 0;
}

export function validateQuantity(value: string, precision: number): QuantityIssue | null {
  const parsed = parseDecimal(value);
  if (!parsed) return "invalid";
  if (/^0*$/.test(parsed.integer) && parsed.fraction === "") return "not_positive";
  if (parsed.integer.length > MAX_INTEGER_DIGITS) return "too_large";
  if (parsed.fraction.length > precision) return "too_precise";
  return null;
}

export function quantityIssueMessage(issue: QuantityIssue, precision: number): string {
  switch (issue) {
    case "invalid":
      return "Enter a number, for example 12 or 2.5.";
    case "not_positive":
      return "Quantity must be greater than zero.";
    case "too_large":
      return "Quantity is too large.";
    case "too_precise":
      return precision === 0
        ? "This unit only allows whole numbers."
        : `This unit allows at most ${precision} decimal place${precision === 1 ? "" : "s"}.`;
  }
}

/** Compare two non-negative decimal strings without converting to floats. */
export function compareDecimal(a: string, b: string): -1 | 0 | 1 {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  if (!left || !right) throw new Error(`Invalid decimal comparison: "${a}" vs "${b}"`);
  if (left.integer.length !== right.integer.length) {
    return left.integer.length > right.integer.length ? 1 : -1;
  }
  if (left.integer !== right.integer) return left.integer > right.integer ? 1 : -1;
  const width = Math.max(left.fraction.length, right.fraction.length);
  const lf = left.fraction.padEnd(width, "0");
  const rf = right.fraction.padEnd(width, "0");
  if (lf === rf) return 0;
  return lf > rf ? 1 : -1;
}

/** Normalize to a canonical form, e.g. "007.50" → "7.5". */
export function normalizeDecimal(value: string): string {
  const parsed = parseDecimal(value);
  if (!parsed) throw new Error(`Invalid decimal: "${value}"`);
  return parsed.fraction ? `${parsed.integer}.${parsed.fraction}` : parsed.integer;
}

// ---------------------------------------------------------------------------
// Exact decimal arithmetic on strings (scaled BigInt; never floats).
// ---------------------------------------------------------------------------

function splitSigned(value: string): { negative: boolean; magnitude: string } {
  const trimmed = value.trim();
  return trimmed.startsWith("-")
    ? { negative: true, magnitude: trimmed.slice(1) }
    : { negative: false, magnitude: trimmed };
}

function scaleOf(value: string): number {
  return decimalPlaces(splitSigned(value).magnitude);
}

function toScaled(value: string, scale: number): bigint {
  const { negative, magnitude } = splitSigned(value);
  const parsed = parseDecimal(magnitude);
  if (!parsed) throw new Error(`Invalid decimal: "${value}"`);
  const digits = BigInt(parsed.integer + parsed.fraction.padEnd(scale, "0").slice(0, scale));
  return negative ? -digits : digits;
}

function fromScaled(scaled: bigint, scale: number): string {
  const negative = scaled < 0n;
  const digits = (negative ? -scaled : scaled).toString().padStart(scale + 1, "0");
  const integer = scale === 0 ? digits : digits.slice(0, -scale);
  const fraction = scale === 0 ? "" : digits.slice(-scale).replace(/0+$/, "");
  const result = fraction ? `${integer}.${fraction}` : integer;
  return negative && result !== "0" ? `-${result}` : result;
}

export function addDecimal(a: string, b: string): string {
  const scale = Math.max(scaleOf(a), scaleOf(b));
  return fromScaled(toScaled(a, scale) + toScaled(b, scale), scale);
}

export function subtractDecimal(a: string, b: string): string {
  const scale = Math.max(scaleOf(a), scaleOf(b));
  return fromScaled(toScaled(a, scale) - toScaled(b, scale), scale);
}

export function sumDecimals(values: readonly string[]): string {
  return values.reduce((total, value) => addDecimal(total, value), "0");
}

export function isNegativeDecimal(value: string): boolean {
  const scale = scaleOf(value);
  return toScaled(value, scale) < 0n;
}

/** Convert an integer count of minor units (10^-precision) to a decimal string. */
export function decimalFromMinorUnits(minorUnits: number, precision: number): string {
  return fromScaled(BigInt(minorUnits), precision);
}
