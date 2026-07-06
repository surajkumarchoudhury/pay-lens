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
import { formatMonthYear, formatShortDate, formatTenure } from "@/lib/date";
import { revealedColumns } from "@/lib/employee-columns";
import { genderLabel } from "@/lib/employee-gender";
import type { CurrencyOption, EmployeeRow, SortDir } from "@/lib/employees";
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

export function EmployeesTable({
  rows,
  sortBy,
  sortDir,
  currencies,
}: {
  rows: EmployeeRow[];
  sortBy: string | null;
  sortDir: SortDir;
  currencies: CurrencyOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Column order + visibility come from the shared settings context (persisted
  // to localStorage, driven by the "Manage columns" popover in the toolbar).
  const {
    order: columnOrder,
    visibility: columnVisibility,
    setOrder,
    setVisibility,
  } = useColumnSettings();

  // Temporarily reveal any hidden column that has an active filter (e.g. a
  // dashboard donut drills in on Gender/Work mode), so the user can always see
  // the dimension they filtered by. Display-only: it doesn't touch the saved
  // layout, so the Columns picker still reflects the real preference and
  // clearing the filter reverts the column to hidden.
  const effectiveVisibility = useMemo(() => {
    const revealed = revealedColumns((k) => searchParams.get(k));
    if (revealed.length === 0) return columnVisibility;
    const next = { ...columnVisibility };
    for (const id of revealed) next[id] = true;
    return next;
  }, [columnVisibility, searchParams]);

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
    accessorKey: "gender",
    header: "Gender",
    size: 130,
    enableSorting: false,
    cell: ({ row }) => genderLabel(row.original.gender),
  },
  {
    accessorKey: "hireDate",
    header: "Hire date",
    size: 140,
    cell: ({ row }) => {
      const iso = row.original.hireDate;
      return (
        <span title={`Hired ${formatShortDate(iso)} · ${formatTenure(iso)} tenure`}>
          {formatMonthYear(iso)}
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
      return <span title={formatShortDate(iso)}>{formatMonthYear(iso)}</span>;
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
    accessorKey: "compaRatio",
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
      columnVisibility={effectiveVisibility}
      onColumnOrderChange={setOrder}
      onColumnVisibilityChange={setVisibility}
      pinnedColumnId="name"
      onRowClick={(row) => router.push(`/employees/${row.id}`)}
    />
  );
}
