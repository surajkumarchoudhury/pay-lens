/**
 * Seed-side salary/title helpers. The band math (level base × country
 * multiplier) lives in src/lib/salary-bands so the seed and the running app
 * share one definition and can't drift. This file adds the title-building
 * helpers the seed needs on top of that shared band data.
 */

import {
  LEVEL_BASE_USD,
  COUNTRY_MULTIPLIER,
  LEVELS,
  bandMidpointUsd,
  type Level,
} from "../../src/lib/salary-bands";

export { LEVEL_BASE_USD, COUNTRY_MULTIPLIER, LEVELS };
export type { Level };

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
  return bandMidpointUsd(level, countryIso2);
}
