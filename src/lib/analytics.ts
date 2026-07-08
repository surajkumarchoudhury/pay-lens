import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import {
  shapePayBreakdowns,
  type PayBreakdowns,
  type PayGroupStat,
} from "@/lib/pay-breakdown";

/**
 * Dashboard KPI figures. All monetary values are USD-normalized (matching the
 * departments view) so they're comparable across pay currencies. The
 * "workforce" excludes TERMINATED employees; compensation aggregates read each
 * employee's current SalaryRecord.
 *
 * Compa-ratio band convention (shared with the employees table): below < 0.90,
 * within 0.90–1.10, above > 1.10.
 */
export type DashboardStats = {
  // Headcount
  headcount: number; // active + on-leave
  activeCount: number;
  onLeaveCount: number;
  // Work mode
  remoteCount: number;
  remotePct: number; // % of workforce
  // Compensation (USD, current records, workforce)
  annualPayrollUsd: number; // Σ total comp
  avgBaseUsd: number | null;
  avgTotalUsd: number | null;
  // Pay-band health
  avgCompaRatio: number | null;
  compaSampleSize: number; // records with a compa-ratio (the % denominator)
  withinBandCount: number;
  withinBandPct: number;
  belowBandCount: number;
  belowBandPct: number;
  aboveBandCount: number;
};

const BAND_MIN = 0.9;
const BAND_MAX = 1.1;

/** One bar in the "headcount by department" chart. */
export type DepartmentHeadcount = {
  id: string;
  name: string;
  headcount: number;
};

/** Workforce headcount per gender. */
export type GenderBreakdown = { gender: string; count: number };

export const getGenderBreakdown = cache(
  async (): Promise<GenderBreakdown[]> => {
    const grouped = await prisma.employee.groupBy({
      by: ["gender"],
      where: { status: { not: "TERMINATED" } },
      _count: { _all: true },
    });
    return grouped.map((g) => ({ gender: g.gender, count: g._count._all }));
  },
);

/**
 * Active + on-leave headcount per department, largest first. Empty departments
 * are omitted (a groupBy only yields departments that have matching employees).
 */
export const getHeadcountByDepartment = cache(async (): Promise<
  DepartmentHeadcount[]
> => {
  const [grouped, departments] = await Promise.all([
    prisma.employee.groupBy({
      by: ["departmentId"],
      where: { status: { not: "TERMINATED" } },
      _count: { _all: true },
    }),
    prisma.department.findMany({ select: { id: true, name: true } }),
  ]);

  const nameById = new Map(departments.map((d) => [d.id, d.name]));

  return grouped
    .map((g) => ({
      id: g.departmentId,
      name: nameById.get(g.departmentId) ?? "Unknown",
      headcount: g._count._all,
    }))
    .sort((a, b) => b.headcount - a.headcount);
});

/**
 * Pay distribution (min / median / p90 / max / mean) of current total comp, in
 * USD, grouped three ways: by country, department and level. The workforce
 * excludes terminated employees.
 *
 * The aggregation runs DB-side: a single pass over the current salary records
 * uses `percentile_cont` for median/p90 and `GROUP BY GROUPING SETS` to emit all
 * three groupings at once, so Postgres returns a few dozen summary rows instead
 * of shipping ~10k rows to the app to sort in JS. `annualizedTotalUsd` is cast to
 * `float8` (and `count` to `int`) so Prisma hands back plain numbers rather than
 * Decimals/BigInts. Label resolution + ordering stays in the pure, unit-tested
 * `shapePayBreakdowns`.
 */
export const getPayBreakdowns = cache(async (): Promise<PayBreakdowns> => {
  const [groups, departments, countries] = await Promise.all([
    prisma.$queryRaw<PayGroupStat[]>`
      SELECT
        CASE
          WHEN e."countryIso2" IS NOT NULL THEN 'country'
          WHEN e."departmentId" IS NOT NULL THEN 'department'
          ELSE 'level'
        END AS dim,
        COALESCE(e."countryIso2", e."departmentId", e."level"::text) AS key,
        COUNT(*)::int AS count,
        MIN(s."annualizedTotalUsd")::float8 AS min,
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY s."annualizedTotalUsd"))::float8 AS median,
        (percentile_cont(0.9) WITHIN GROUP (ORDER BY s."annualizedTotalUsd"))::float8 AS p90,
        MAX(s."annualizedTotalUsd")::float8 AS max,
        AVG(s."annualizedTotalUsd")::float8 AS mean
      FROM "SalaryRecord" s
      JOIN "Employee" e ON e."id" = s."employeeId"
      WHERE s."isCurrent" = true AND e."status"::text <> 'TERMINATED'
      GROUP BY GROUPING SETS ((e."countryIso2"), (e."departmentId"), (e."level"))
    `,
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.country.findMany({ select: { iso2: true, name: true } }),
  ]);

  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const countryName = new Map(countries.map((c) => [c.iso2, c.name]));

  return shapePayBreakdowns(groups, {
    departmentName: (id) => deptName.get(id) ?? id,
    countryName: (iso2) => countryName.get(iso2) ?? iso2,
  });
});

export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  // Workforce = everyone not terminated; comp reads their current salary record.
  const employeeWhere = { status: { not: "TERMINATED" as const } };
  const salaryWhere = {
    isCurrent: true,
    employee: { status: { not: "TERMINATED" as const } },
  };

  const [
    byStatus,
    remoteCount,
    comp,
    withinBandCount,
    belowBandCount,
    aboveBandCount,
  ] = await Promise.all([
    prisma.employee.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.employee.count({ where: { ...employeeWhere, isRemote: true } }),
    prisma.salaryRecord.aggregate({
      where: salaryWhere,
      _sum: { annualizedTotalUsd: true },
      _avg: { annualizedUsd: true, annualizedTotalUsd: true, compaRatio: true },
      _count: { _all: true },
    }),
    prisma.salaryRecord.count({
      where: { ...salaryWhere, compaRatio: { gte: BAND_MIN, lte: BAND_MAX } },
    }),
    prisma.salaryRecord.count({
      where: { ...salaryWhere, compaRatio: { lt: BAND_MIN } },
    }),
    prisma.salaryRecord.count({
      where: { ...salaryWhere, compaRatio: { gt: BAND_MAX } },
    }),
  ]);

  const statusCount = (status: string) =>
    byStatus.find((s) => s.status === status)?._count._all ?? 0;

  const activeCount = statusCount("ACTIVE");
  const onLeaveCount = statusCount("ON_LEAVE");
  const headcount = activeCount + onLeaveCount;

  const compaSampleSize = comp._count._all;
  const pct = (n: number) =>
    compaSampleSize > 0 ? (n / compaSampleSize) * 100 : 0;

  return {
    headcount,
    activeCount,
    onLeaveCount,
    remoteCount,
    remotePct: headcount > 0 ? (remoteCount / headcount) * 100 : 0,
    annualPayrollUsd: Number(comp._sum.annualizedTotalUsd ?? 0),
    avgBaseUsd:
      comp._avg.annualizedUsd != null ? Number(comp._avg.annualizedUsd) : null,
    avgTotalUsd:
      comp._avg.annualizedTotalUsd != null
        ? Number(comp._avg.annualizedTotalUsd)
        : null,
    avgCompaRatio:
      comp._avg.compaRatio != null ? Number(comp._avg.compaRatio) : null,
    compaSampleSize,
    withinBandCount,
    withinBandPct: pct(withinBandCount),
    belowBandCount,
    belowBandPct: pct(belowBandCount),
    aboveBandCount,
  };
});
