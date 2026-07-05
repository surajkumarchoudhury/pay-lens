/**
 * Salary bands that make the seed realistic: pay correlates with level and
 * country, so analytics (pay by country / level) produce meaningful, explainable
 * results rather than noise. All figures are annual USD midpoints.
 */

export const LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"] as const;
export type Level = (typeof LEVELS)[number];

/** Base annual total-compensation midpoint (USD) per seniority level. */
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

/** Seniority prefix per level, used to build a job title. */
export const LEVEL_TITLE_PREFIX: Record<Level, string> = {
  L1: "Junior",
  L2: "Associate",
  L3: "",
  L4: "Senior",
  L5: "Staff",
  L6: "Principal",
  L7: "Director of",
};

/** Base job title per department. */
export const DEPARTMENT_TITLE: Record<string, string> = {
  Engineering: "Software Engineer",
  Product: "Product Manager",
  Design: "Designer",
  Sales: "Account Executive",
  Marketing: "Marketing Specialist",
  Finance: "Financial Analyst",
  HR: "People Partner",
  Operations: "Operations Analyst",
  Support: "Support Specialist",
  Legal: "Legal Counsel",
};

export function buildTitle(department: string, level: Level): string {
  const prefix = LEVEL_TITLE_PREFIX[level];
  const base = DEPARTMENT_TITLE[department] ?? "Specialist";
  return prefix ? `${prefix} ${base}` : base;
}

/** Target annual USD compensation for a level in a country, before jitter. */
export function targetAnnualUsd(level: Level, countryIso2: string): number {
  const base = LEVEL_BASE_USD[level];
  const mult = COUNTRY_MULTIPLIER[countryIso2] ?? 0.7;
  return base * mult;
}
