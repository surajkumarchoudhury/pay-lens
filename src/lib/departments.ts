import "server-only";

import { prisma } from "@/lib/prisma";

export type SortDir = "asc" | "desc";

/** One row of the departments table: headcount + average current compensation. */
export type DepartmentRow = {
  id: string;
  name: string;
  headcount: number;
  // Averages over each department's *current* salary records, normalized to USD
  // (the only currency-comparable figure). Null when the department is empty.
  avgBaseUsd: number | null;
  avgTotalUsd: number | null;
};

/** Whitelisted sort keys → comparators (aggregates are sorted in-memory). */
const SORTERS: Record<string, (a: DepartmentRow, b: DepartmentRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  headcount: (a, b) => a.headcount - b.headcount,
  avgBase: (a, b) => (a.avgBaseUsd ?? 0) - (b.avgBaseUsd ?? 0),
  avgTotal: (a, b) => (a.avgTotalUsd ?? 0) - (b.avgTotalUsd ?? 0),
};

export const DEPARTMENT_SORTABLE_COLUMNS = Object.keys(SORTERS);

/**
 * All departments with headcount and average current compensation. The set of
 * departments is small (tens), so we aggregate per-department in parallel and
 * sort in memory rather than reaching for raw SQL. Averages come from each
 * employee's current SalaryRecord, in USD.
 */
export async function listDepartments(params: {
  sortBy?: string;
  sortDir?: SortDir;
}): Promise<DepartmentRow[]> {
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const rows: DepartmentRow[] = await Promise.all(
    departments.map(async (d) => {
      const agg = await prisma.salaryRecord.aggregate({
        where: { isCurrent: true, employee: { departmentId: d.id } },
        _count: { _all: true },
        _avg: { annualizedUsd: true, annualizedTotalUsd: true },
      });
      return {
        id: d.id,
        name: d.name,
        headcount: agg._count._all,
        avgBaseUsd:
          agg._avg.annualizedUsd != null ? Number(agg._avg.annualizedUsd) : null,
        avgTotalUsd:
          agg._avg.annualizedTotalUsd != null
            ? Number(agg._avg.annualizedTotalUsd)
            : null,
      };
    }),
  );

  const sorter = params.sortBy ? SORTERS[params.sortBy] : undefined;
  if (sorter) {
    const dir = params.sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => sorter(a, b) * dir);
  }

  return rows;
}
