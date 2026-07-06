"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { AuditEntry } from "@/lib/audit";
import { cn } from "@/lib/utils";

const ACTION_STYLES: Record<string, string> = {
  CREATE:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  UPDATE: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  DELETE: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Organization-wide audit table (mirrors the gemini "Log History" layout):
 * User · Event · Resource · Name · Date, with each row expanding to a
 * field-level Old → New diff from the stored before/after snapshots.
 */
export function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (entries.length === 0) {
    return (
      <div className="rounded-xs border border-border/60 bg-card px-6 py-10 text-center text-sm text-muted-foreground">
        No changes recorded yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-xs border border-border/60 bg-card">
      <table className="w-full table-fixed text-sm text-foreground">
        <thead className="sticky top-0 z-10">
          <tr className="text-left font-semibold text-foreground [&>th]:border-b [&>th]:border-border/60 [&>th]:bg-[color-mix(in_oklab,var(--color-primary)_5%,var(--color-card))] [&>th]:px-4 [&>th]:py-2.5">
            <th className="w-10" />
            <th className="w-64">User</th>
            <th className="w-32">Event</th>
            <th className="w-40">Resource</th>
            <th>Name</th>
            <th className="w-52">Date</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <Row
              key={entry.id}
              entry={entry}
              isOpen={expanded.has(entry.id)}
              onToggle={() => toggle(entry.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  entry,
  isOpen,
  onToggle,
}: {
  entry: AuditEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const hasDiff = entry.diff.length > 0;
  return (
    <>
      <tr
        onClick={hasDiff ? onToggle : undefined}
        className={cn(
          "border-b border-border/60 transition-colors last:border-0",
          hasDiff && "cursor-pointer hover:bg-muted/40",
        )}
      >
        <td className="px-4 py-2.5 align-middle">
          {hasDiff && (
            <ChevronRight
              className={cn(
                "size-4 text-muted-foreground transition-transform",
                isOpen && "rotate-90",
              )}
              aria-hidden
            />
          )}
        </td>
        <td className="truncate px-4 py-2.5 text-muted-foreground" title={entry.changedBy}>
          {entry.changedBy}
        </td>
        <td className="px-4 py-2.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
              ACTION_STYLES[entry.action] ??
                "border-border bg-muted text-muted-foreground",
            )}
          >
            {entry.action}
          </span>
        </td>
        <td className="px-4 py-2.5 text-foreground">{entry.entity}</td>
        <td className="truncate px-4 py-2.5">
          {entry.employeeId && entry.employeeName ? (
            <Link
              href={`/employees/${entry.employeeId}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {entry.employeeName}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
          {formatDateTime(entry.createdAt)}
        </td>
      </tr>
      {isOpen && hasDiff && (
        <tr className="border-b border-border/60 last:border-0">
          <td />
          <td colSpan={5} className="px-4 pb-4 pt-1">
            <DiffTable diff={entry.diff} />
          </td>
        </tr>
      )}
    </>
  );
}

function DiffTable({ diff }: { diff: AuditEntry["diff"] }) {
  return (
    <div className="overflow-hidden rounded-xs border border-border/60 bg-background">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground [&>th]:border-b [&>th]:border-border/60 [&>th]:px-3 [&>th]:py-1.5 [&>th]:font-medium">
            <th className="w-1/3">Field</th>
            <th>Old</th>
            <th>New</th>
          </tr>
        </thead>
        <tbody>
          {diff.map((row) => (
            <tr
              key={row.field}
              className="[&>td]:border-b [&>td]:border-border/40 [&>td]:px-3 [&>td]:py-1.5 last:[&>td]:border-0"
            >
              <td className="font-medium text-foreground">{row.field}</td>
              <td className="tabular-nums text-muted-foreground line-through">
                {row.old ?? "—"}
              </td>
              <td className="tabular-nums font-medium text-foreground">
                {row.new ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
