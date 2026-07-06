"use client";

import { useRouter } from "next/navigation";

import { ChartCard, type CsvExport } from "@/components/analytics/chart-card";
import type { PayBreakdownRow } from "@/lib/analytics";
import { formatCompactMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Which employee-list filter a row click applies. Kept as a serializable string
 * (not an href-builder function) so the parent Server Component can pass it
 * across the server/client boundary.
 */
export type PayBreakdownDrill = "level" | "country" | "department";

/** Build the employee-list URL for a drilled row, using existing filter params. */
function drillHref(drill: PayBreakdownDrill, row: PayBreakdownRow): string {
  switch (drill) {
    case "level":
      return `/employees?level=${row.key}`;
    case "country":
      return `/employees?field=country&q=${encodeURIComponent(row.name)}`;
    case "department":
      return `/employees?field=department&q=${encodeURIComponent(row.name)}`;
  }
}

/**
 * A pay-distribution table for a single grouping dimension (country /
 * department / level). Shows headcount plus the six-number USD total-comp
 * summary, and — when `drillHref` is supplied — lets a row click jump to the
 * matching employee list. Reuses ChartCard so it gets the same titled chrome +
 * CSV export as the dashboard charts.
 */
export function PayBreakdownCard({
  title,
  description,
  groupLabel,
  rows,
  csvFilename,
  drill,
}: {
  title: string;
  description?: string;
  groupLabel: string;
  rows: PayBreakdownRow[];
  csvFilename: string;
  drill?: PayBreakdownDrill;
}) {
  const router = useRouter();

  const csv: CsvExport = {
    filename: csvFilename,
    rows: [
      [
        groupLabel,
        "Headcount",
        "Min (USD)",
        "Median (USD)",
        "Average (USD)",
        "P90 (USD)",
        "Max (USD)",
      ],
      ...rows.map((r) => [
        r.name,
        r.count,
        Math.round(r.min),
        Math.round(r.median),
        Math.round(r.mean),
        Math.round(r.p90),
        Math.round(r.max),
      ]),
    ],
  };

  return (
    <ChartCard
      title={title}
      description={description}
      csv={csv}
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No compensation data to summarize.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">{groupLabel}</th>
                <th className="px-3 py-2 text-right font-semibold">n</th>
                <th className="px-3 py-2 text-right font-semibold">Min</th>
                <th className="px-3 py-2 text-right font-semibold">Median</th>
                <th className="px-3 py-2 text-right font-semibold">Avg</th>
                <th className="px-3 py-2 text-right font-semibold">P90</th>
                <th className="px-4 py-2 text-right font-semibold">Max</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const href = drill ? drillHref(drill, r) : undefined;
                return (
                  <tr
                    key={r.key}
                    onClick={href ? () => router.push(href) : undefined}
                    className={cn(
                      "border-b border-border/40 last:border-0",
                      href && "cursor-pointer transition-colors hover:bg-muted",
                    )}
                  >
                    <td className="max-w-[180px] truncate px-4 py-2 font-medium text-foreground">
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {r.count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCompactMoney(r.min)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">
                      {formatCompactMoney(r.median)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCompactMoney(r.mean)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCompactMoney(r.p90)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      {formatCompactMoney(r.max)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}
