import { cookies } from "next/headers";

import { ColumnSettingsProvider } from "@/components/employees/column-settings";
import {
  COLUMN_COOKIE_NAME,
  parseColumnLayout,
} from "@/lib/employee-columns";
import { EmployeeFilters } from "@/components/employees/filters/employee-filters";
import { EmployeesTable } from "@/components/employees/employees-table";
import { TablePagination } from "@/components/table-pagination";
import { getSession } from "@/lib/auth/session";
import { parseGenders } from "@/lib/employee-gender";
import { parseLevels } from "@/lib/employee-level";
import { resolveSearchField } from "@/lib/employee-search";
import { parseStatuses } from "@/lib/employee-status";
import { parseWorkMode } from "@/lib/employee-work-mode";
import { first, parsePage, parsePageSize } from "@/lib/search-params";
import {
  getCurrencies,
  getOrgCurrency,
  listEmployees,
  type CurrencyOption,
  type EmployeeFilterParams,
  type SortDir,
} from "@/lib/employees";

type ListEmployeesParams = EmployeeFilterParams & {
  page?: number;
  pageSize?: number;
};

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
  const genders = parseGenders(first(sp.gender));
  const workMode = parseWorkMode(first(sp.mode));

  // The filter bar needs org/currency reference + role; these are cheap and
  // don't change per filter, so fetch them once here (outside the Suspense
  // boundary) and keep the bar interactive while results reload.
  const [orgCurrency, currencies, session, cookieStore] = await Promise.all([
    getOrgCurrency(),
    getCurrencies(),
    getSession(),
    cookies(),
  ]);

  const canManage = session?.role === "HR_MANAGER";

  // Read the saved column layout server-side so SSR renders the user's actual
  // columns (no hydration mismatch, no first-paint reflow).
  const columnLayout = parseColumnLayout(
    cookieStore.get(COLUMN_COOKIE_NAME)?.value,
  );

  const filters: ListEmployeesParams = {
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
    genders,
    workMode,
    hireDateFrom,
    hireDateTo,
    effectiveDateFrom,
    effectiveDateTo,
  };

  return (
    <ColumnSettingsProvider initialState={columnLayout}>
      <div className="flex h-full flex-col">
        <div>
          <EmployeeFilters
            currencies={currencies}
            orgCurrency={orgCurrency}
            canManage={canManage}
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
              genders,
              workMode: workMode ?? null,
              hireDateFrom,
              hireDateTo,
              effectiveDateFrom,
              effectiveDateTo,
            }}
          />
        </div>

        <EmployeesResults filters={filters} currencies={currencies} />
      </div>
    </ColumnSettingsProvider>
  );
}

async function EmployeesResults({
  filters,
  currencies,
}: {
  filters: ListEmployeesParams;
  currencies: CurrencyOption[];
}) {
  const { rows, total, page, pageSize, pageCount, sortBy, sortDir } =
    await listEmployees(filters);

  if (rows.length === 0) {
    return (
      <div className="mt-4 rounded-md border border-dashed px-12 py-24 text-center text-sm text-muted-foreground">
        No employees match your search.
      </div>
    );
  }

  return (
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
  );
}
