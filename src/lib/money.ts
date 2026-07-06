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

/**
 * Compact currency for tight spots like KPI cards — "$1.5B", "$820.4K".
 * Defaults to USD since most aggregate figures are USD-normalized.
 */
export function formatCompactMoney(
  amount: number,
  currencyCode = "USD",
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
