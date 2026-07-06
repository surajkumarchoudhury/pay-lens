import "server-only";

import type { EmployeeLevel, EmployeeStatus, Gender, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  resolveSearchField,
  type SearchFieldId,
  type SearchSuggestion,
} from "@/lib/employee-search";
import { bandPlacement, type BandPlacement } from "@/lib/salary-bands";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/pagination";

// Re-exported so existing server callers can keep importing from here.
export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS };

export type SortDir = "asc" | "desc";

/**
 * Whitelist mapping each search field → a Prisma `where` on Employee. All are
 * text fields using case-insensitive `contains`. (Level lives in a dedicated
 * multi-select facet, not free-text search.)
 */
const SEARCH_MAP: Record<
  SearchFieldId,
  (term: string) => Prisma.EmployeeWhereInput
> = {
  // Split on whitespace so "ada lovelace" matches first + last in any order,
  // instead of looking for the whole phrase in a single column.
  name: (t) => ({
    AND: t
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => ({
        OR: [
          { firstName: { contains: token, mode: "insensitive" as const } },
          { lastName: { contains: token, mode: "insensitive" as const } },
        ],
      })),
  }),
  email: (t) => ({ email: { contains: t, mode: "insensitive" } }),
  title: (t) => ({ title: { contains: t, mode: "insensitive" } }),
  country: (t) => ({ country: { name: { contains: t, mode: "insensitive" } } }),
  employeeNumber: (t) => ({
    employeeNumber: { contains: t, mode: "insensitive" },
  }),
  department: (t) => ({
    department: { name: { contains: t, mode: "insensitive" } },
  }),
};

/**
 * The organization's reporting currency (code + symbol). Used by the employee
 * table's "convert" toggle to show every salary in one comparable currency.
 * Falls back to USD if the org row or currency is somehow missing.
 */
export async function getOrgCurrency(): Promise<{
  code: string;
  symbol: string;
}> {
  const org = await prisma.organization.findFirst({
    select: { baseCurrency: true },
  });
  const code = org?.baseCurrency ?? "USD";
  const currency = await prisma.currency.findUnique({
    where: { code },
    select: { symbol: true },
  });
  return { code, symbol: currency?.symbol ?? "$" };
}

export type CurrencyOption = {
  code: string;
  symbol: string;
  name: string;
  rateToUsd: number;
};

/** All currencies (code, symbol, name, rate) for the currency picker. */
export async function getCurrencies(): Promise<CurrencyOption[]> {
  const rows = await prisma.currency.findMany({
    select: { code: true, symbol: true, name: true, rateToUsd: true },
    orderBy: { code: "asc" },
  });
  return rows.map((c) => ({
    code: c.code,
    symbol: c.symbol,
    name: c.name,
    rateToUsd: Number(c.rateToUsd),
  }));
}

/**
 * Whitelist of sortable columns → Prisma orderBy. Keying off a fixed map (not
 * raw user input) prevents ordering by arbitrary fields.
 *
 * We deliberately only sort by the columns where ordering is a genuine need:
 * `name` (alphabetical lookup), `hireDate` (seniority/tenure) and the money
 * columns (comp ranking). The categorical fields — department, country, status,
 * level, title — are far more useful as *filters* than sorts, so they're
 * intentionally excluded here.
 *
 * The query is rooted at the *current* SalaryRecord (see listEmployees), so the
 * employee's own fields are reached through the to-one `employee` relation.
 * Money sorts use the currency- and frequency-normalized, indexed USD columns
 * (annualizedUsd / annualizedTotalUsd) — the only meaningful way to compare pay
 * across countries. `salary` is the annual base column.
 */
const SORT_MAP: Record<
  string,
  (dir: SortDir) => Prisma.SalaryRecordOrderByWithRelationInput[]
> = {
  name: (dir) => [{ employee: { lastName: dir } }, { employee: { firstName: dir } }],
  hireDate: (dir) => [{ employee: { hireDate: dir } }],
  effectiveDate: (dir) => [{ effectiveDate: dir }],
  salary: (dir) => [{ annualizedUsd: dir }],
  totalComp: (dir) => [{ annualizedTotalUsd: dir }],
  compa: (dir) => [{ compaRatio: dir }],
};

export const SORTABLE_COLUMNS = Object.keys(SORT_MAP);

/** Flat, serializable shape for the table — decoupled from Prisma models. */
export type EmployeeRow = {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  title: string;
  level: EmployeeLevel;
  status: EmployeeStatus;
  department: string;
  country: string;
  countryIso2: string;
  isRemote: boolean;
  hireDate: string; // ISO date; tenure is derived client-side
  effectiveDate: string; // ISO date the current comp took effect
  // Compa-ratio (base pay vs level/country band midpoint) and where that lands
  // relative to the band. Null when no band midpoint is known for the level.
  compaRatio: number | null;
  bandPlacement: BandPlacement | null;
  salary: {
    annualLocal: number; // annual base salary in the employee's own currency
    annualUsd: number; // base normalized to USD — the sort/compare key
    totalAnnualLocal: number; // annual total comp (base + bonus) in own currency
    totalAnnualUsd: number; // total comp normalized to USD
    currencyCode: string;
  } | null;
};

export type EmployeeListResult = {
  rows: EmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  sortBy: string | null;
  sortDir: SortDir;
};

/** Clamp a raw page-size param to an allowed option. */
function normalizePageSize(value: number): number {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value)
    ? value
    : DEFAULT_PAGE_SIZE;
}

/** USD-per-unit rate for a currency code; 1 for USD or an unknown code. */
async function getUsdRate(currencyCode: string | undefined): Promise<number> {
  const code = currencyCode?.toUpperCase() ?? "USD";
  const currency = await prisma.currency.findUnique({
    where: { code },
    select: { rateToUsd: true },
  });
  return currency ? Number(currency.rateToUsd) : 1;
}

/**
 * Build a Prisma numeric filter for a min/max range, scaling each bound by
 * `rate` (USD-per-unit). Returns undefined when there is no usable bound. This
 * is what lets a user filter "≥ ₹20,00,000" against records stored as
 * normalized USD, and is reused for base pay and total comp alike. For a
 * unitless range (e.g. compa-ratio) pass rate = 1.
 */
function rangeFilter(
  min: number | undefined,
  max: number | undefined,
  rate: number,
): Prisma.DecimalFilter | undefined {
  const hasMin = typeof min === "number" && Number.isFinite(min) && min >= 0;
  const hasMax = typeof max === "number" && Number.isFinite(max) && max >= 0;
  if (!hasMin && !hasMax) return undefined;

  const filter: Prisma.DecimalFilter = {};
  if (hasMin) filter.gte = min! * rate;
  if (hasMax) filter.lte = max! * rate;
  return filter;
}

/** Filter/sort inputs shared by the paged list and the (unpaged) CSV export. */
export type EmployeeFilterParams = {
  sortBy?: string;
  sortDir?: SortDir;
  search?: string;
  searchField?: string;
  salaryMin?: number;
  salaryMax?: number;
  totalCompMin?: number;
  totalCompMax?: number;
  compaMin?: number;
  compaMax?: number;
  salaryCurrency?: string;
  statuses?: EmployeeStatus[];
  levels?: EmployeeLevel[];
  hireDateFrom?: string; // ISO date (YYYY-MM-DD)
  hireDateTo?: string; // ISO date (YYYY-MM-DD)
  effectiveDateFrom?: string; // ISO date (YYYY-MM-DD)
  effectiveDateTo?: string; // ISO date (YYYY-MM-DD)
};

/**
 * Parse a `YYYY-MM-DD` filter bound into a UTC Date, or undefined when absent /
 * malformed. `endOfDay` pushes the `to` bound to 23:59:59.999 so the range is
 * inclusive of the whole day the user picked.
 */
function parseDateBound(
  value: string | undefined,
  endOfDay = false,
): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return undefined;
  const d = new Date(
    `${value.trim()}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
  );
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Prisma DateTime filter for a date range; undefined when unbounded. */
function dateRangeFilter(
  from: string | undefined,
  to: string | undefined,
): Prisma.DateTimeFilter | undefined {
  const gte = parseDateBound(from);
  const lte = parseDateBound(to, true);
  if (!gte && !lte) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (gte) filter.gte = gte;
  if (lte) filter.lte = lte;
  return filter;
}

/** Columns selected for every SalaryRecord we flatten into an EmployeeRow. */
const EMPLOYEE_ROW_SELECT = {
  basePay: true,
  totalComp: true,
  currencyCode: true,
  annualizedUsd: true,
  annualizedTotalUsd: true,
  compaRatio: true,
  effectiveDate: true,
  frequency: { select: { annualFactor: true } },
  employee: {
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      title: true,
      level: true,
      status: true,
      isRemote: true,
      hireDate: true,
      department: { select: { name: true } },
      country: { select: { name: true, iso2: true } },
    },
  },
} satisfies Prisma.SalaryRecordSelect;

type SalaryRecordRow = Prisma.SalaryRecordGetPayload<{
  select: typeof EMPLOYEE_ROW_SELECT;
}>;

/** Flatten a current SalaryRecord (+ its employee) into the table row shape. */
function toEmployeeRow(r: SalaryRecordRow): EmployeeRow {
  const e = r.employee;
  const factor = r.frequency.annualFactor;
  const base = Number(r.basePay);
  const total = Number(r.totalComp);
  const annualBaseUsd = Number(r.annualizedUsd);
  const totalAnnualUsd = Number(r.annualizedTotalUsd);
  // Denormalized on write (see seed / migration), so display, placement and
  // the compa-ratio filter all read the same stored value.
  const ratio = r.compaRatio != null ? Number(r.compaRatio) : null;
  return {
    id: e.id,
    employeeNumber: e.employeeNumber,
    fullName: `${e.firstName} ${e.lastName}`,
    email: e.email,
    avatarUrl: e.avatarUrl,
    title: e.title,
    level: e.level,
    status: e.status,
    department: e.department.name,
    country: e.country.name,
    countryIso2: e.country.iso2,
    isRemote: e.isRemote,
    hireDate: e.hireDate.toISOString(),
    effectiveDate: r.effectiveDate.toISOString(),
    compaRatio: ratio,
    bandPlacement: ratio != null ? bandPlacement(ratio) : null,
    salary: {
      annualLocal: base * factor,
      annualUsd: annualBaseUsd,
      totalAnnualLocal: total * factor,
      totalAnnualUsd,
      currencyCode: r.currencyCode,
    },
  };
}

/**
 * Build the shared Prisma `where` + `orderBy` for the current-salary query.
 *
 * Rooted at SalaryRecord (isCurrent = true) rather than Employee: every
 * employee has exactly one current record (guaranteed by the seed and the write
 * path), so this stays 1:1 with the directory while letting Postgres order by
 * the salary itself (annualizedUsd) — which Prisma can't do through a to-many
 * relation. Employee-owned facets sort/filter via the to-one `employee`
 * relation. Async because money-range bounds are converted to USD using the
 * selected currency's stored rate.
 */
async function buildCurrentSalaryQuery(params: EmployeeFilterParams): Promise<{
  where: Prisma.SalaryRecordWhereInput;
  orderBy: Prisma.SalaryRecordOrderByWithRelationInput[];
  sortBy: string | null;
  sortDir: SortDir;
}> {
  const sortBy = params.sortBy && SORT_MAP[params.sortBy] ? params.sortBy : null;
  const sortDir: SortDir = params.sortDir === "desc" ? "desc" : "asc";

  const orderBy: Prisma.SalaryRecordOrderByWithRelationInput[] = [
    ...(sortBy
      ? SORT_MAP[sortBy](sortDir)
      : [{ employee: { lastName: "asc" as SortDir } }]),
    { id: "asc" },
  ];

  const term = params.search?.trim() ?? "";
  const field: SearchFieldId = resolveSearchField(params.searchField);

  // Combine the (optional) text search and categorical facets into one Employee
  // filter; multiple conditions are AND-ed.
  const employeeConditions: Prisma.EmployeeWhereInput[] = [];
  if (term) employeeConditions.push(SEARCH_MAP[field](term));
  if (params.statuses?.length) {
    employeeConditions.push({ status: { in: params.statuses } });
  }
  if (params.levels?.length) {
    employeeConditions.push({ level: { in: params.levels } });
  }
  const hireDate = dateRangeFilter(params.hireDateFrom, params.hireDateTo);
  if (hireDate) employeeConditions.push({ hireDate });
  const employeeWhere =
    employeeConditions.length > 0 ? { AND: employeeConditions } : undefined;

  // Effective date lives on the SalaryRecord itself (when the current comp took
  // effect), so it filters the record root rather than the employee relation.
  const effectiveDate = dateRangeFilter(
    params.effectiveDateFrom,
    params.effectiveDateTo,
  );

  // Money ranges: the user enters amounts in a chosen currency; we convert to
  // USD (via the stored rateToUsd, fetched once) and filter the normalized
  // annual USD columns. Compa-ratio is unitless, so it filters the stored
  // `compaRatio` column directly (rate = 1).
  const rate = await getUsdRate(params.salaryCurrency);
  const annualizedUsd = rangeFilter(params.salaryMin, params.salaryMax, rate);
  const annualizedTotalUsd = rangeFilter(
    params.totalCompMin,
    params.totalCompMax,
    rate,
  );
  const compaRatioFilter = rangeFilter(params.compaMin, params.compaMax, 1);

  const where: Prisma.SalaryRecordWhereInput = {
    isCurrent: true,
    ...(employeeWhere ? { employee: employeeWhere } : {}),
    ...(annualizedUsd ? { annualizedUsd } : {}),
    ...(annualizedTotalUsd ? { annualizedTotalUsd } : {}),
    ...(compaRatioFilter ? { compaRatio: compaRatioFilter } : {}),
    ...(effectiveDate ? { effectiveDate } : {}),
  };

  return { where, orderBy, sortBy, sortDir };
}

/**
 * One page of employees with their current compensation. skip/take keeps us off
 * the full 10k set; a stable `id` tiebreaker makes pagination deterministic.
 */
export async function listEmployees(
  params: EmployeeFilterParams & { page?: number; pageSize?: number },
): Promise<EmployeeListResult> {
  const pageSize = normalizePageSize(params.pageSize ?? DEFAULT_PAGE_SIZE);
  const page = Math.max(1, params.page ?? 1);

  const { where, orderBy, sortBy, sortDir } =
    await buildCurrentSalaryQuery(params);

  const [total, records] = await Promise.all([
    prisma.salaryRecord.count({ where }),
    prisma.salaryRecord.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      select: EMPLOYEE_ROW_SELECT,
    }),
  ]);

  return {
    rows: records.map(toEmployeeRow),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    sortBy,
    sortDir,
  };
}

/** Hard cap on a single CSV export, to bound memory and response time. */
export const EXPORT_MAX_ROWS = 20_000;

/**
 * All employees matching the given filters/sort, unpaged (capped at
 * EXPORT_MAX_ROWS). Backs the CSV export — it reuses the table's exact
 * filter/sort so the file mirrors what the user is looking at.
 */
export async function exportEmployees(
  params: EmployeeFilterParams,
): Promise<EmployeeRow[]> {
  const { where, orderBy } = await buildCurrentSalaryQuery(params);
  const records = await prisma.salaryRecord.findMany({
    where,
    orderBy,
    take: EXPORT_MAX_ROWS,
    select: EMPLOYEE_ROW_SELECT,
  });
  return records.map(toEmployeeRow);
}

/** One compensation record in an employee's history (annualized to USD + local). */
export type SalaryHistoryEntry = {
  id: string;
  effectiveDate: string; // ISO
  isCurrent: boolean;
  frequencyLabel: string;
  /** Periods per year for this record's frequency (annual=1, monthly=12). */
  annualFactor: number;
  currencyCode: string;
  currencySymbol: string;
  /** Value of 1 unit of the local currency in USD (for a client-side preview). */
  rateToUsd: number;
  /** Optimistic-concurrency guard: echoed back when recording a change. */
  version: number;
  baseLocal: number; // annual base in the employee's own currency
  baseUsd: number;
  totalLocal: number; // annual total comp in own currency
  totalUsd: number;
  compaRatio: number | null;
  bandPlacement: BandPlacement | null;
};

/** Full employee profile + compensation history for the detail page. */
export type EmployeeDetail = {
  id: string;
  employeeNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  gender: Gender;
  title: string;
  level: EmployeeLevel;
  status: EmployeeStatus;
  isRemote: boolean;
  hireDate: string; // ISO
  dob: string | null; // ISO
  department: string;
  departmentId: string;
  country: string;
  countryIso2: string;
  /** All records, current first then most-recent effective date. */
  history: SalaryHistoryEntry[];
};

/**
 * Full profile + compensation history for a single employee (the detail page).
 * Returns null when the id doesn't exist. History includes the current record
 * and any prior (raised-from) records, newest first — the non-current rows the
 * list view never surfaces.
 */
export async function getEmployeeDetail(
  id: string,
): Promise<EmployeeDetail | null> {
  const e = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      email: true,
      avatarUrl: true,
      gender: true,
      title: true,
      level: true,
      status: true,
      isRemote: true,
      hireDate: true,
      dob: true,
      departmentId: true,
      department: { select: { name: true } },
      country: { select: { name: true, iso2: true } },
      salaryRecords: {
        orderBy: [{ isCurrent: "desc" }, { effectiveDate: "desc" }],
        select: {
          id: true,
          basePay: true,
          totalComp: true,
          currencyCode: true,
          annualizedUsd: true,
          annualizedTotalUsd: true,
          compaRatio: true,
          effectiveDate: true,
          isCurrent: true,
          version: true,
          frequency: { select: { label: true, annualFactor: true } },
          currency: { select: { symbol: true, rateToUsd: true } },
        },
      },
    },
  });
  if (!e) return null;

  const history: SalaryHistoryEntry[] = e.salaryRecords.map((r) => {
    const factor = r.frequency.annualFactor;
    const ratio = r.compaRatio != null ? Number(r.compaRatio) : null;
    return {
      id: r.id,
      effectiveDate: r.effectiveDate.toISOString(),
      isCurrent: r.isCurrent,
      frequencyLabel: r.frequency.label,
      annualFactor: r.frequency.annualFactor,
      currencyCode: r.currencyCode,
      currencySymbol: r.currency.symbol,
      rateToUsd: Number(r.currency.rateToUsd),
      version: r.version,
      baseLocal: Number(r.basePay) * factor,
      baseUsd: Number(r.annualizedUsd),
      totalLocal: Number(r.totalComp) * factor,
      totalUsd: Number(r.annualizedTotalUsd),
      compaRatio: ratio,
      bandPlacement: ratio != null ? bandPlacement(ratio) : null,
    };
  });

  return {
    id: e.id,
    employeeNumber: e.employeeNumber,
    fullName: `${e.firstName} ${e.lastName}`,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    avatarUrl: e.avatarUrl,
    gender: e.gender,
    title: e.title,
    level: e.level,
    status: e.status,
    isRemote: e.isRemote,
    hireDate: e.hireDate.toISOString(),
    dob: e.dob ? e.dob.toISOString() : null,
    department: e.department.name,
    departmentId: e.departmentId,
    country: e.country.name,
    countryIso2: e.country.iso2,
    history,
  };
}

const SUGGESTION_LIMIT = 8;

/**
 * Typeahead suggestions for the active search field. Returns at most
 * SUGGESTION_LIMIT distinct matches. Lookup/reference fields (country,
 * department) query their own small tables; employee fields query Employee.
 */
export async function searchSuggestions(
  fieldRaw: string,
  termRaw: string,
): Promise<SearchSuggestion[]> {
  const field = resolveSearchField(fieldRaw);
  const term = termRaw.trim();
  if (!term) return [];

  const insensitive = { contains: term, mode: "insensitive" as const };

  switch (field) {
    case "name": {
      const rows = await prisma.employee.findMany({
        where: SEARCH_MAP.name(term),
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: SUGGESTION_LIMIT,
      });
      return rows.map((e) => ({
        value: `${e.firstName} ${e.lastName}`,
        label: `${e.firstName} ${e.lastName}`,
        subLabel: e.email,
        avatarUrl: e.avatarUrl,
      }));
    }
    case "email": {
      const rows = await prisma.employee.findMany({
        where: { email: insensitive },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
        orderBy: { email: "asc" },
        take: SUGGESTION_LIMIT,
      });
      // Selecting applies the email (`value`); the card shows name over email.
      return rows.map((e) => ({
        value: e.email,
        label: `${e.firstName} ${e.lastName}`,
        subLabel: e.email,
        avatarUrl: e.avatarUrl,
      }));
    }
    case "title": {
      const rows = await prisma.employee.findMany({
        where: { title: insensitive },
        select: { title: true },
        distinct: ["title"],
        orderBy: { title: "asc" },
        take: SUGGESTION_LIMIT,
      });
      return rows.map((r) => ({ value: r.title, label: r.title }));
    }
    case "country": {
      const rows = await prisma.country.findMany({
        where: { name: insensitive },
        select: { name: true },
        orderBy: { name: "asc" },
        take: SUGGESTION_LIMIT,
      });
      return rows.map((r) => ({ value: r.name, label: r.name }));
    }
    case "employeeNumber": {
      const rows = await prisma.employee.findMany({
        where: { employeeNumber: insensitive },
        select: { employeeNumber: true, firstName: true, lastName: true },
        orderBy: { employeeNumber: "asc" },
        take: SUGGESTION_LIMIT,
      });
      return rows.map((e) => ({
        value: e.employeeNumber,
        label: e.employeeNumber,
        hint: `${e.firstName} ${e.lastName}`,
      }));
    }
    case "department": {
      const rows = await prisma.department.findMany({
        where: { name: insensitive },
        select: { name: true },
        orderBy: { name: "asc" },
        take: SUGGESTION_LIMIT,
      });
      return rows.map((r) => ({ value: r.name, label: r.name }));
    }
  }
}
