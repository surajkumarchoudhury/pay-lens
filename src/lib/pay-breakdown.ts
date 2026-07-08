/**
 * Pure shaping of pre-aggregated pay-breakdown groups: resolve group ids to
 * display labels and order the rows. The heavy min/median/p90/max/mean
 * aggregation runs DB-side (`percentile_cont` + `GROUP BY GROUPING SETS`, see
 * `getPayBreakdowns` in analytics.ts); this module stays free of
 * `server-only`/Prisma so the label + ordering logic is unit-tested in isolation.
 */

import { levelLabel, type EmployeeLevelId } from "@/lib/employee-level";
import { type Summary } from "@/lib/stats";

export type PayDimension = "country" | "department" | "level";

/** One DB-aggregated group: its dimension, key, and USD total-comp summary. */
export type PayGroupStat = Summary & {
  dim: PayDimension;
  /** ISO-2 code / department id / level enum, depending on `dim`. */
  key: string;
};

/** Resolve group ids to display labels (falls back to the id when unknown). */
export type PayNameResolvers = {
  departmentName: (id: string) => string;
  countryName: (iso2: string) => string;
};

/** One row of a pay breakdown: a group + its USD total-comp summary. */
export type PayBreakdownRow = Summary & {
  /** Stable id for drill-through (ISO-2 code / department id / level enum). */
  key: string;
  /** Human-readable group label. */
  name: string;
};

export type PayBreakdowns = {
  byCountry: PayBreakdownRow[];
  byDepartment: PayBreakdownRow[];
  byLevel: PayBreakdownRow[];
};

const byMedianDesc = (a: PayBreakdownRow, b: PayBreakdownRow) =>
  b.median - a.median;

/**
 * Split DB-aggregated group stats into the three breakdowns, attaching a
 * human-readable label to each. Country/department rows are ordered
 * highest-median first (the interesting outliers); level rows keep their
 * L1→L7 ladder order.
 */
export function shapePayBreakdowns(
  groups: PayGroupStat[],
  resolvers: PayNameResolvers,
): PayBreakdowns {
  const byCountry: PayBreakdownRow[] = [];
  const byDepartment: PayBreakdownRow[] = [];
  const byLevel: PayBreakdownRow[] = [];

  for (const { dim, key, ...summary } of groups) {
    if (dim === "country") {
      byCountry.push({ key, name: resolvers.countryName(key), ...summary });
    } else if (dim === "department") {
      byDepartment.push({
        key,
        name: resolvers.departmentName(key),
        ...summary,
      });
    } else {
      byLevel.push({
        key,
        name: levelLabel(key as EmployeeLevelId),
        ...summary,
      });
    }
  }

  byCountry.sort(byMedianDesc);
  byDepartment.sort(byMedianDesc);
  byLevel.sort((a, b) => a.key.localeCompare(b.key));

  return { byCountry, byDepartment, byLevel };
}
