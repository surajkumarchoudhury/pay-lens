"use client";

import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

import { useColumnSettings } from "@/components/employees/column-settings";
import { Tooltip } from "@/components/ui/tooltip";

/**
 * Export the current view to CSV. Links to the export API with the active
 * filters/sort (current query string) plus the visible columns in their current
 * order (`cols`), so the file mirrors the table exactly. It's a plain download
 * anchor — the server responds with an attachment, so the page never navigates.
 */
export function ExportButton() {
  const searchParams = useSearchParams();
  const { order, visibility } = useColumnSettings();

  const params = new URLSearchParams(searchParams.toString());
  params.delete("page");
  params.delete("pageSize");
  const cols = order.filter((id) => visibility[id] !== false);
  params.set("cols", cols.join(","));

  return (
    <Tooltip label="Export CSV">
      <a
        href={`/api/employees/export?${params.toString()}`}
        download
        aria-label="Export CSV"
        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-input text-foreground transition-colors hover:bg-muted"
      >
        <Download className="size-4" />
      </a>
    </Tooltip>
  );
}
