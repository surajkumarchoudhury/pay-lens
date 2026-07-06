"use client";

import { Download } from "lucide-react";

import { Tooltip } from "@/components/ui/tooltip";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

/** CSV payload for a chart card's export button. First row = header. */
export type CsvExport = {
  filename: string;
  rows: (string | number)[][];
};

/**
 * Shared shell for dashboard charts: a titled card with an optional CSV export
 * and a padded body for the chart. Mirrors the app's DataTable-style reuse so
 * every chart gets identical chrome (title, description, export).
 */
export function ChartCard({
  title,
  description,
  csv,
  bodyClassName,
  children,
}: {
  title: string;
  description?: string;
  csv?: CsvExport;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xs border border-border/60 bg-card">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {csv && csv.rows.length > 1 && (
          <Tooltip label="Export CSV">
            <button
              type="button"
              onClick={() => downloadCsv(csv.filename, csv.rows)}
              aria-label="Export CSV"
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="size-4" />
            </button>
          </Tooltip>
        )}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
}
