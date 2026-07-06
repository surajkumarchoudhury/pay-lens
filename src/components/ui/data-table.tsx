"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  type ColumnOrderState,
  type RowData,
  type SortingState,
  type TableMeta,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Right-align the header + cells (for numeric columns). */
    align?: "right";
  }
}

type SortDir = "asc" | "desc";

/**
 * Generic, presentational data table shared across the app (employees,
 * departments, …). Owns the table "chrome": TanStack setup, URL-driven sorting,
 * a sticky header, an optional pinned-left column, column sizing / dynamic
 * min-width, sortable header buttons, row hover, and click-through.
 *
 * Callers supply the row type, the ColumnDefs (with cell renderers) and the
 * current sort. Feature-specific concerns (column settings, currency, badges)
 * live in the caller's ColumnDefs / meta, not here.
 */
export function DataTable<T extends RowData>({
  data,
  columns,
  sortBy,
  sortDir,
  meta,
  columnOrder,
  columnVisibility,
  onColumnOrderChange,
  onColumnVisibilityChange,
  pinnedColumnId,
  onRowClick,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  sortBy: string | null;
  sortDir: SortDir;
  meta?: TableMeta<T>;
  columnOrder?: string[];
  columnVisibility?: VisibilityState;
  onColumnOrderChange?: (order: ColumnOrderState) => void;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  /** Column id kept pinned to the left while scrolling horizontally. */
  pinnedColumnId?: string;
  onRowClick?: (row: T) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sorting: SortingState = sortBy
    ? [{ id: sortBy, desc: sortDir === "desc" }]
    : [];

  const applySorting = (next: SortingState) => {
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
  };

  // TanStack Table returns non-memoizable functions; the advisory lint about
  // library incompatibility is expected here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      ...(columnOrder ? { columnOrder } : {}),
      ...(columnVisibility ? { columnVisibility } : {}),
    },
    meta,
    manualPagination: true,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      applySorting(next);
    },
    onColumnOrderChange: (updater) => {
      if (!onColumnOrderChange) return;
      onColumnOrderChange(
        typeof updater === "function" ? updater(columnOrder ?? []) : updater,
      );
    },
    onColumnVisibilityChange: (updater) => {
      if (!onColumnVisibilityChange) return;
      onColumnVisibilityChange(
        typeof updater === "function"
          ? updater(columnVisibility ?? {})
          : updater,
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
                const pinned = header.column.id === pinnedColumnId;
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
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn(
                "group border-b border-border/60 transition-colors hover:bg-[color-mix(in_oklab,var(--color-muted)_40%,var(--color-card))]",
                onRowClick && "cursor-pointer",
              )}
            >
              {row.getVisibleCells().map((cell) => {
                const pinned = cell.column.id === pinnedColumnId;
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
