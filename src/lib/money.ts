/**
 * Pure money helpers. Deterministic and side-effect free so they can be unit
 * tested in isolation and reused by both the seed script and the analytics layer.
 *
 * Convention: `rateToUsd` is the value of 1 unit of a currency in USD
 * (e.g. INR rateToUsd = 0.012 means 1 INR = 0.012 USD).
 */

/** Round to 2 decimal places (cents). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Convert a native-currency amount to USD. */
export function toUsd(amount: number, rateToUsd: number): number {
  return round2(amount * rateToUsd);
}

/** Convert a USD amount to a native-currency amount. */
export function fromUsd(amountUsd: number, rateToUsd: number): number {
  return round2(amountUsd / rateToUsd);
}

/** Annualize a per-period amount using a frequency's annual factor. */
export function annualize(amountPerPeriod: number, annualFactor: number): number {
  return round2(amountPerPeriod * annualFactor);
}

/**
 * Format an amount as currency using the currency's own symbol (e.g. ₹, €, $).
 * Whole numbers by default — salaries read cleaner without cents.
 */
export function formatMoney(
  amount: number,
  currencyCode: string,
  fractionDigits = 0,
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

/** Compact scale tiers, largest first. */
const COMPACT_TIERS: { value: number; suffix: string }[] = [
  { value: 1e12, suffix: "T" },
  { value: 1e9, suffix: "B" },
  { value: 1e6, suffix: "M" },
  { value: 1e3, suffix: "K" },
];

/**
 * Compact currency for tight spots like KPI cards — "$1.5B", "$820.4K", "$59K".
 * Defaults to USD since most aggregate figures are USD-normalized.
 *
 * We scale + suffix by hand rather than using `Intl` `notation: "compact"`:
 * ICU's compact output differs across environments (Node vs browser render
 * "$59.0K" vs "$59K"), which causes React hydration mismatches. Formatting the
 * mantissa with standard notation is deterministic everywhere.
 */
export function formatCompactMoney(
  amount: number,
  currencyCode = "USD",
): string {
  const abs = Math.abs(amount);
  const tier = COMPACT_TIERS.find((t) => abs >= t.value);
  if (!tier) return formatMoney(Math.round(amount), currencyCode);

  const scaled = amount / tier.value;
  // One decimal, but drop it for whole values ("$59K" not "$59.0K").
  const digits = Number.isInteger(Math.round(scaled * 10) / 10) ? 0 : 1;
  return `${formatMoney(scaled, currencyCode, digits)}${tier.suffix}`;
}
