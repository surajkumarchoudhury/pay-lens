/**
 * Salary-band math — the single source of truth shared by the seed script (to
 * generate realistic pay) and the app (to show a live compa-ratio / band
 * placement). There is no SalaryBand table: a band midpoint is derived from a
 * per-level base (annual USD) scaled by a country cost-of-labor multiplier.
 *
 * Kept dependency-free (no `server-only`, no Prisma) so it can be imported by a
 * plain Node seed script and by server components alike.
 */

export const LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"] as const;
export type Level = (typeof LEVELS)[number];

/** Annual band-midpoint (USD) per seniority level, before country scaling. */
export const LEVEL_BASE_USD: Record<Level, number> = {
  L1: 45_000,
  L2: 65_000,
  L3: 90_000,
  L4: 120_000,
  L5: 160_000,
  L6: 210_000,
  L7: 280_000,
};

/** Relative labor-cost multiplier by country (US = 1.0). */
export const COUNTRY_MULTIPLIER: Record<string, number> = {
  US: 1.0,
  GB: 0.9,
  DE: 0.9,
  FR: 0.85,
  CA: 0.85,
  AU: 0.85,
  SG: 0.8,
  JP: 0.8,
  BR: 0.4,
  ZA: 0.45,
  IN: 0.35,
};

/** Multiplier applied to countries without an explicit entry above. */
export const DEFAULT_COUNTRY_MULTIPLIER = 0.7;

/** Annual band midpoint (USD) for a level in a given country. */
export function bandMidpointUsd(level: Level, countryIso2: string): number {
  const base = LEVEL_BASE_USD[level];
  const mult = COUNTRY_MULTIPLIER[countryIso2] ?? DEFAULT_COUNTRY_MULTIPLIER;
  return base * mult;
}

/**
 * Compa-ratio = annual base pay (USD) ÷ band midpoint (USD). 1.0 means paid
 * exactly at the level/country midpoint. Returns null when no midpoint is known.
 * Base pay (not total comp) vs midpoint is the standard HR convention.
 */
export function compaRatio(
  annualBaseUsd: number,
  level: Level,
  countryIso2: string,
): number | null {
  const mid = bandMidpointUsd(level, countryIso2);
  if (!mid) return null;
  return annualBaseUsd / mid;
}

export type BandPlacement = "below" | "within" | "above";

/** Compa-ratio boundaries for the "within band" window (±10% of midpoint). */
export const BAND_LOWER = 0.9;
export const BAND_UPPER = 1.1;

export function bandPlacement(ratio: number): BandPlacement {
  if (ratio < BAND_LOWER) return "below";
  if (ratio > BAND_UPPER) return "above";
  return "within";
}
