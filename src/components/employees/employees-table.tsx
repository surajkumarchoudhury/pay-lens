"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type RowData,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import {
  CompaBadge,
  StatusBadge,
  WorkModeBadge,
} from "@/components/employees/badges";
import { useCurrencyParam } from "@/components/employees/currency-select";
import { useColumnSettings } from "@/components/employees/column-settings";
import type { CurrencyOption, EmployeeRow, SortDir } from "@/lib/employees";
import { formatMoney, fromUsd } from "@/lib/money";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "right";
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    // Currency the salary column renders in; null shows each row's own
    // (local) currency.
    displayCurrency: CurrencyOption | null;
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
}: {
  rows: EmployeeRow[];
  sortBy: string | null;
  sortDir: SortDir;
  currencies: CurrencyOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortDir === "desc" }]
    : [];

  const applySorting = useCallback(
    (next: SortingState) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.length === 0) {
        params.delete("sort");
        params.delete("dir");
      } else {
        params.set("sort", next[0].id);
        params.set("dir", next[0].desc ? "desc" : "asc");
      }
      // A new sort order invalidates the current page offset.
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

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

  // TanStack Table returns non-memoizable functions; React Compiler correctly
  // skips this component (see the "use no memo" directive above). This silences
  // the accompanying advisory lint.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnOrder, columnVisibility },
    meta: { displayCurrency },
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      applySorting(next);
    },
    onColumnOrderChange: (updater) => {
      setOrder(typeof updater === "function" ? updater(columnOrder) : updater);
    },
    onColumnVisibilityChange: (updater) => {
      setVisibility(
        typeof updater === "function" ? updater(columnVisibility) : updater,
      );
    },
  });

  // Sum of the visible columns' widths so the table shrinks when columns are
  // hidden (instead of a fixed min-width that would leave dead space).
  const minWidth = table
    .getVisibleLeafColumns()
    .reduce((sum, col) => sum + col.getSize(), 0);

  return (
    <div className="h-full overflow-auto rounded-xs border border-border/60 bg-card">
      <table
        className="w-full table-fixed text-sm text-foreground"
        style={{ minWidth }}
      >
        <thead className="sticky top-0 z-20">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="text-left text-sm font-semibold text-foreground"
            >
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const align = header.column.columnDef.meta?.align;
                const pinned = header.column.id === "name";
                return (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className={cn(
                      // Subtle primary tint; opaque so scrolled rows don't bleed
                      // through the sticky header.
                      "h-10 border-b border-r border-border/60 bg-[color-mix(in_oklab,var(--color-primary)_5%,var(--color-card))] px-4 font-semibold last:border-r-0",
                      pinned && "sticky left-0 z-30",
                      align === "right" && "text-right",
                    )}
                  >
                    {canSort ? (
                      <div
                        className={cn(
                          "flex items-center gap-2",
                          align === "right" && "justify-end",
                        )}
                      >
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex cursor-pointer items-center gap-1 transition-colors hover:text-primary"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sorted === "asc" ? (
                            <ChevronUp className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 text-muted-foreground/60" />
                          )}
                        </button>
                      </div>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => router.push(`/employees/${row.original.id}`)}
              className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))]"
            >
              {row.getVisibleCells().map((cell) => {
                const pinned = cell.column.id === "name";
                return (
                  <td
                    key={cell.id}
                    style={{ width: cell.column.getSize() }}
                    className={cn(
                      "h-11 border-r border-border/60 px-4 last:border-r-0",
                      // Opaque backgrounds (not /alpha) so horizontally-scrolled
                      // content never shows through the pinned column, including
                      // on hover where a translucent tint would let it bleed.
                      pinned &&
                        "sticky left-0 z-10 bg-card group-hover:bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))]",
                      cell.column.columnDef.meta?.align === "right" &&
                        "text-right",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
