"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type ColumnDef, type RowData } from "@tanstack/react-table";

import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
import {
  CompaBadge,
  StatusBadge,
  WorkModeBadge,
} from "@/components/employees/badges";
import { useCurrencyParam } from "@/components/employees/currency-select";
import { useColumnSettings } from "@/components/employees/column-settings";
import type { CurrencyOption, EmployeeRow, SortDir } from "@/lib/employees";
import { resultsToken } from "@/lib/employees-url";
import { formatMoney, fromUsd } from "@/lib/money";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    // Currency the salary column renders in; null shows each row's own
    // (local) currency.
    displayCurrency?: CurrencyOption | null;
  }
}

export type OrgCurrency = { code: string; symbol: string };

/** "Mar 2021" — a hire date compact enough for a table cell. */
function formatHireDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/** "Mar 14, 2021" — the precise date, surfaced on hover. */
function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Whole-ish tenure from a hire date, e.g. "4y 2m", "7 mo", "1 yr". */
function formatTenure(iso: string): string {
  const months = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
  );
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years <= 0) return `${months} mo`;
  if (rem === 0) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${years}y ${rem}m`;
}

export function EmployeesTable({
  rows,
  sortBy,
  sortDir,
  currencies,
  renderedToken,
}: {
  rows: EmployeeRow[];
  sortBy: string | null;
  sortDir: SortDir;
  currencies: CurrencyOption[];
  /** Params token this data was rendered for; stale vs the URL ⇒ loading. */
  renderedToken: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // While a navigation is in flight the table stays mounted showing the old
  // rows; the live URL token diverges from what this data was rendered for, so
  // we overlay a body-only loading state (the header stays constant).
  const isLoading = resultsToken((k) => searchParams.get(k)) !== renderedToken;

  // Column order + visibility come from the shared settings context (persisted
  // to localStorage, driven by the "Manage columns" popover in the toolbar).
  const {
    order: columnOrder,
    visibility: columnVisibility,
    setOrder,
    setVisibility,
  } = useColumnSettings();

  // Display currency comes from the shared `cur` URL param, set by the global
  // Currency control on the filter bar; null = Local (each row's own).
  const [displayCode] = useCurrencyParam();
  const displayCurrency = displayCode
    ? (currencies.find((c) => c.code === displayCode) ?? null)
    : null;

  const columns: ColumnDef<EmployeeRow>[] = useMemo(() => [
    {
      id: "name",
      accessorKey: "fullName",
      header: "Employee",
      size: 280,
      cell: ({ row }) => {
        const e = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={e.fullName} src={e.avatarUrl} className="size-7 text-[10px]" />
            <div className="min-w-0">
              <Link
                href={`/employees/${e.id}`}
                className="block truncate font-medium text-foreground hover:text-primary hover:underline"
              >
                {e.fullName}
              </Link>
              <div className="truncate text-xs text-muted-foreground">{e.email}</div>
            </div>
          </div>
        );
      },
    },
  {
    accessorKey: "title",
    header: "Title",
    size: 260,
    enableSorting: false,
    cell: ({ row }) => <span className="truncate">{row.original.title}</span>,
  },
  {
    accessorKey: "level",
    header: "Level",
    size: 96,
    enableSorting: false,
    cell: ({ row }) => row.original.level,
  },
  {
    accessorKey: "department",
    header: "Department",
    size: 160,
    enableSorting: false,
    cell: ({ row }) => (
      <span className="truncate">{row.original.department}</span>
    ),
  },
  {
    accessorKey: "country",
    header: "Country",
    size: 160,
    enableSorting: false,
    cell: ({ row }) => <span className="truncate">{row.original.country}</span>,
  },
  {
    accessorKey: "hireDate",
    header: "Hire date",
    size: 140,
    cell: ({ row }) => {
      const iso = row.original.hireDate;
      return (
        <span title={`Hired ${formatFullDate(iso)} · ${formatTenure(iso)} tenure`}>
          {formatHireDate(iso)}
        </span>
      );
    },
  },
  {
    accessorKey: "effectiveDate",
    header: "Effective date",
    size: 150,
    cell: ({ row }) => {
      const iso = row.original.effectiveDate;
      return <span title={formatFullDate(iso)}>{formatHireDate(iso)}</span>;
    },
  },
  {
    accessorKey: "isRemote",
    header: "Work mode",
    size: 120,
    enableSorting: false,
    cell: ({ row }) => <WorkModeBadge remote={row.original.isRemote} />,
  },
  {
    id: "salary",
    accessorKey: "salary",
    header: "Annual base",
    size: 160,
    meta: { align: "right" },
    cell: ({ row, table }) => {
      const s = row.original.salary;
      if (!s) return <span className="text-muted-foreground">—</span>;
      const { displayCurrency } = table.options.meta!;
      // Convert from the normalized USD value into the chosen currency; with no
      // selection, show the amount in the employee's own (local) currency.
      const [amount, code] = displayCurrency
        ? [fromUsd(s.annualUsd, displayCurrency.rateToUsd), displayCurrency.code]
        : [s.annualLocal, s.currencyCode];
      return (
        <span className="font-medium tabular-nums">
          {formatMoney(amount, code)}
        </span>
      );
    },
  },
  {
    id: "totalComp",
    accessorKey: "salary",
    header: "Total comp",
    size: 160,
    meta: { align: "right" },
    cell: ({ row, table }) => {
      const s = row.original.salary;
      if (!s) return <span className="text-muted-foreground">—</span>;
      const { displayCurrency } = table.options.meta!;
      const [amount, code] = displayCurrency
        ? [fromUsd(s.totalAnnualUsd, displayCurrency.rateToUsd), displayCurrency.code]
        : [s.totalAnnualLocal, s.currencyCode];
      return <span className="tabular-nums">{formatMoney(amount, code)}</span>;
    },
  },
  {
    id: "compa",
    header: "Compa-ratio",
    size: 150,
    cell: ({ row }) => (
      <CompaBadge
        ratio={row.original.compaRatio}
        placement={row.original.bandPlacement}
      />
    ),
  },
    {
      accessorKey: "status",
      header: "Status",
      size: 120,
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ], []);

  return (
    <DataTable<EmployeeRow>
      data={rows}
      columns={columns}
      sortBy={sortBy}
      sortDir={sortDir}
      meta={{ displayCurrency }}
      columnOrder={columnOrder}
      columnVisibility={columnVisibility}
      onColumnOrderChange={setOrder}
      onColumnVisibilityChange={setVisibility}
      pinnedColumnId="name"
      isLoading={isLoading}
      onRowClick={(row) => router.push(`/employees/${row.id}`)}
    />
  );
}
