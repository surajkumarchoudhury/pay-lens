/**
 * CSV export mapping for the employee table. One entry per table column id
 * (see EMPLOYEE_COLUMN_META), each with the column's title and a plain-string
 * value extractor that mirrors what the cell renders. Kept free of `server-only`
 * so it can be unit-tested and reused; the API route drives it server-side.
 *
 * Money cells honor the shared display currency exactly like the table: when a
 * currency is selected we convert the USD-normalized amount, otherwise we show
 * the employee's local amount.
 */

import type { CurrencyOption, EmployeeRow } from "@/lib/employees";
import { statusLabel, type EmployeeStatusId } from "@/lib/employee-status";
import { formatMoney, fromUsd } from "@/lib/money";

export type ExportContext = {
  /** Selected display currency, or null for each row's local currency. */
  displayCurrency: CurrencyOption | null;
};

type ExportColumn = {
  title: string;
  value: (row: EmployeeRow, ctx: ExportContext) => string;
};

/** Format an annual money figure the same way the table cell does. */
function money(
  amountUsd: number,
  localAmount: number,
  localCode: string,
  ctx: ExportContext,
): string {
  return ctx.displayCurrency
    ? formatMoney(
        fromUsd(amountUsd, ctx.displayCurrency.rateToUsd),
        ctx.displayCurrency.code,
      )
    : formatMoney(localAmount, localCode);
}

export const EXPORT_COLUMNS: Record<string, ExportColumn> = {
  name: { title: "Employee", value: (r) => r.fullName },
  title: { title: "Title", value: (r) => r.title },
  level: { title: "Level", value: (r) => r.level },
  department: { title: "Department", value: (r) => r.department },
  country: { title: "Country", value: (r) => r.country },
  hireDate: { title: "Hire date", value: (r) => r.hireDate.slice(0, 10) },
  effectiveDate: {
    title: "Effective date",
    value: (r) => r.effectiveDate.slice(0, 10),
  },
  isRemote: { title: "Work mode", value: (r) => (r.isRemote ? "Remote" : "On-site") },
  salary: {
    title: "Annual base",
    value: (r, ctx) =>
      r.salary
        ? money(r.salary.annualUsd, r.salary.annualLocal, r.salary.currencyCode, ctx)
        : "",
  },
  totalComp: {
    title: "Total comp",
    value: (r, ctx) =>
      r.salary
        ? money(
            r.salary.totalAnnualUsd,
            r.salary.totalAnnualLocal,
            r.salary.currencyCode,
            ctx,
          )
        : "",
  },
  compa: {
    title: "Compa-ratio",
    value: (r) => (r.compaRatio != null ? r.compaRatio.toFixed(2) : ""),
  },
  status: {
    title: "Status",
    value: (r) => statusLabel(r.status as EmployeeStatusId),
  },
};

/** Escape a single CSV field per RFC 4180 (quote if it holds , " or newline). */
function escapeField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Serialize rows to CSV using the given ordered column ids (unknown ids are
 * skipped). CRLF line endings for maximum spreadsheet compatibility.
 */
export function buildEmployeesCsv(
  rows: EmployeeRow[],
  columnIds: string[],
  ctx: ExportContext,
): string {
  const cols = columnIds
    .map((id) => EXPORT_COLUMNS[id])
    .filter((c): c is ExportColumn => Boolean(c));

  const header = cols.map((c) => escapeField(c.title)).join(",");
  const body = rows.map((r) =>
    cols.map((c) => escapeField(c.value(r, ctx))).join(","),
  );
  return [header, ...body].join("\r\n");
}
