"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/data-table";
import type { DepartmentRow, SortDir } from "@/lib/departments";
import { formatMoney } from "@/lib/money";

/** Averages are USD-normalized; render em dash for empty departments. */
function money(value: number | null): string {
  return value == null ? "—" : formatMoney(Math.round(value), "USD");
}

export function DepartmentsTable({
  rows,
  sortBy,
  sortDir,
}: {
  rows: DepartmentRow[];
  sortBy: string | null;
  sortDir: SortDir;
}) {
  const router = useRouter();

  const columns: ColumnDef<DepartmentRow>[] = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "Department",
        size: 280,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.name}</span>
        ),
      },
      {
        id: "headcount",
        accessorKey: "headcount",
        header: "Headcount",
        size: 140,
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.headcount}</span>
        ),
      },
      {
        id: "avgBase",
        accessorKey: "avgBaseUsd",
        header: "Avg base (USD)",
        size: 180,
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {money(row.original.avgBaseUsd)}
          </span>
        ),
      },
      {
        id: "avgTotal",
        accessorKey: "avgTotalUsd",
        header: "Avg total comp (USD)",
        size: 200,
        meta: { align: "right" },
        cell: ({ row }) => (
          <span className="tabular-nums">{money(row.original.avgTotalUsd)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<DepartmentRow>
      data={rows}
      columns={columns}
      sortBy={sortBy}
      sortDir={sortDir}
      pinnedColumnId="name"
      onRowClick={(row) =>
        router.push(
          `/employees?field=department&q=${encodeURIComponent(row.name)}`,
        )
      }
    />
  );
}
