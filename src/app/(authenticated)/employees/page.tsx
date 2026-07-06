import { ColumnSettingsProvider } from "@/components/employees/column-settings";
import { EmployeeFilters } from "@/components/employees/filters/employee-filters";
import { EmployeesTable } from "@/components/employees/employees-table";
import { TablePagination } from "@/components/table-pagination";
import { parseLevels } from "@/lib/employee-level";
import { resolveSearchField } from "@/lib/employee-search";
import { parseStatuses } from "@/lib/employee-status";
import {
  getCurrencies,
  getOrgCurrency,
  listEmployees,
  type SortDir,
} from "@/lib/employees";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

function parsePageSize(value: string | undefined): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

/** Parse a non-negative number from a param; undefined when absent/bad. */
function parseAmount(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pageParam = first(sp.page);
  const pageSizeParam = first(sp.pageSize);
  const sortParam = first(sp.sort);
  const dirParam = first(sp.dir) === "desc" ? "desc" : "asc";
  const queryParam = first(sp.q)?.trim() ?? "";
  const searchField = resolveSearchField(first(sp.field));

  const salMinParam = first(sp.salMin) ?? "";
  const salMaxParam = first(sp.salMax) ?? "";
  const compMinParam = first(sp.compMin) ?? "";
  const compMaxParam = first(sp.compMax) ?? "";
  const crMinParam = first(sp.crMin) ?? "";
  const crMaxParam = first(sp.crMax) ?? "";
  // Shared display / range currency; absent = "Local" (range unit falls back
  // to USD server-side).
  const curParam = first(sp.cur)?.toUpperCase() || undefined;

  const hireDateFrom = first(sp.hireFrom) ?? "";
  const hireDateTo = first(sp.hireTo) ?? "";
  const effectiveDateFrom = first(sp.effFrom) ?? "";
  const effectiveDateTo = first(sp.effTo) ?? "";

  const levels = parseLevels(first(sp.level));
  const statuses = parseStatuses(first(sp.status));

  const [
    { rows, total, page, pageSize, pageCount, sortBy, sortDir },
    orgCurrency,
    currencies,
  ] = await Promise.all([
    listEmployees({
      page: parsePage(pageParam),
      pageSize: parsePageSize(pageSizeParam),
      sortBy: sortParam,
      sortDir: dirParam as SortDir,
      search: queryParam,
      searchField,
      salaryMin: parseAmount(salMinParam),
      salaryMax: parseAmount(salMaxParam),
      totalCompMin: parseAmount(compMinParam),
      totalCompMax: parseAmount(compMaxParam),
      compaMin: parseAmount(crMinParam),
      compaMax: parseAmount(crMaxParam),
      salaryCurrency: curParam,
      levels,
      statuses,
      hireDateFrom,
      hireDateTo,
      effectiveDateFrom,
      effectiveDateTo,
    }),
    getOrgCurrency(),
    getCurrencies(),
  ]);

  return (
    <ColumnSettingsProvider>
      <div className="flex h-full flex-col">
        <div>
          <EmployeeFilters
            currencies={currencies}
            orgCurrency={orgCurrency}
            values={{
              query: queryParam,
              field: searchField,
              salaryMin: salMinParam,
              salaryMax: salMaxParam,
              totalCompMin: compMinParam,
              totalCompMax: compMaxParam,
              compaMin: crMinParam,
              compaMax: crMaxParam,
              levels,
              statuses,
              hireDateFrom,
              hireDateTo,
              effectiveDateFrom,
              effectiveDateTo,
            }}
          />
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed p-12 text-center text-sm text-muted-foreground">
            No employees match your search.
          </div>
        ) : (
          <>
            <div className="mt-4 min-h-0 flex-1">
              <EmployeesTable
                rows={rows}
                sortBy={sortBy}
                sortDir={sortDir}
                currencies={currencies}
              />
            </div>
            <div className="-mx-4 shrink-0 border-t bg-background px-6 pt-3">
              <TablePagination
                page={page}
                pageSize={pageSize}
                total={total}
                pageCount={pageCount}
              />
            </div>
          </>
        )}
      </div>
    </ColumnSettingsProvider>
  );
}
