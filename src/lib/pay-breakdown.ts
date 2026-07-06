/**
 * Pure pay-breakdown aggregation: turn per-employee current total-comp records
 * into min/median/p90/max/mean summaries grouped by country, department and
 * level. Kept free of `server-only`/Prisma so it can be unit-tested in
 * isolation; `getPayBreakdowns` (in analytics.ts) fetches the rows + name maps
 * and delegates the grouping here.
 */

import { levelLabel, type EmployeeLevelId } from "@/lib/employee-level";
import { summarize, type Summary } from "@/lib/stats";

/** One employee's current total comp (USD) plus its grouping keys. */
export type PayRecord = {
  totalUsd: number;
  level: string;
  countryIso2: string;
  departmentId: string;
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

function pushValue(map: Map<string, number[]>, key: string, value: number) {
  const bucket = map.get(key);
  if (bucket) bucket.push(value);
  else map.set(key, [value]);
}

function toRows(
  map: Map<string, number[]>,
  label: (key: string) => string,
): PayBreakdownRow[] {
  return [...map.entries()].flatMap(([key, values]) => {
    const summary = summarize(values);
    return summary ? [{ key, name: label(key), ...summary }] : [];
  });
}

const byMedianDesc = (a: PayBreakdownRow, b: PayBreakdownRow) =>
  b.median - a.median;

/**
 * Group `records` three ways and summarize each group. Country/department rows
 * are ordered highest-median first (the interesting outliers); level rows keep
 * their L1→L7 ladder order.
 */
export function buildPayBreakdowns(
  records: PayRecord[],
  resolvers: PayNameResolvers,
): PayBreakdowns {
  const byCountryVals = new Map<string, number[]>();
  const byDeptVals = new Map<string, number[]>();
  const byLevelVals = new Map<string, number[]>();

  for (const r of records) {
    pushValue(byCountryVals, r.countryIso2, r.totalUsd);
    pushValue(byDeptVals, r.departmentId, r.totalUsd);
    pushValue(byLevelVals, r.level, r.totalUsd);
  }

  return {
    byCountry: toRows(byCountryVals, resolvers.countryName).sort(byMedianDesc),
    byDepartment: toRows(byDeptVals, resolvers.departmentName).sort(
      byMedianDesc,
    ),
    byLevel: toRows(byLevelVals, (k) => levelLabel(k as EmployeeLevelId)).sort(
      (a, b) => a.key.localeCompare(b.key),
    ),
  };
}
