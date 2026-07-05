"use client";

import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import { CompaBadge } from "@/components/employees/badges";
import { Input } from "@/components/ui/input";
import type { SalaryHistoryEntry } from "@/lib/employees";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Compensation history card. The table header is sticky so it stays visible as
 * the list grows and the page scrolls, and an effective-date range filter lives
 * beside the title. The change % for each row is computed against the *full*
 * history (the next-older record), so filtering the view never distorts it.
 */
export function CompensationHistory({
  history,
}: {
  history: SalaryHistoryEntry[];
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Bound the date pickers to the actual record range (history is newest-first).
  const maxDate = history[0]?.effectiveDate.slice(0, 10);
  const minDate = history[history.length - 1]?.effectiveDate.slice(0, 10);

  // Base-pay change vs. the next-older record, keyed by id from the full history.
  const pctById = useMemo(() => {
    const map = new Map<string, number | null>();
    history.forEach((entry, i) => {
      const prev = history[i + 1];
      map.set(
        entry.id,
        prev && prev.baseUsd > 0
          ? Math.round(((entry.baseUsd - prev.baseUsd) / prev.baseUsd) * 1000) /
              10
          : null,
      );
    });
    return map;
  }, [history]);

  const filtered = useMemo(
    () =>
      history.filter((e) => {
        const d = e.effectiveDate.slice(0, 10);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      }),
    [history, from, to],
  );

  const hasFilter = Boolean(from || to);

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-foreground">
        Compensation history
      </h2>
      <div className="rounded-xs border border-border/60 bg-card">
      {/* Sticky filter bar. It has the table rows below it in the same block, so
          it pins to the top of the page as those rows scroll. */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-start gap-3 rounded-t-xs border-b border-border/60 bg-card px-6 py-3">
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="Effective date from"
            value={from}
            min={minDate}
            max={to || maxDate}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 w-36 text-xs"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            aria-label="Effective date to"
            value={to}
            min={from || minDate}
            max={maxDate}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 w-36 text-xs"
          />
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
              aria-label="Clear date filter"
              title="Clear date filter"
              className="rounded-xs p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <p className="px-6 py-4 text-sm text-muted-foreground">
          No compensation records.
        </p>
      ) : filtered.length === 0 ? (
        <p className="px-6 py-4 text-sm text-muted-foreground">
          No records in the selected date range.
        </p>
      ) : (
        <table className="w-full text-sm">
          {/* Column header sticks just below the 60px-tall sticky card header.
              Styled to match the employees table: bolder, taller, primary tint. */}
          <thead className="sticky top-15 z-10">
            <tr className="text-left text-sm font-semibold text-foreground [&>th]:h-10 [&>th]:border-b [&>th]:border-border/60 [&>th]:bg-[color-mix(in_oklab,var(--color-primary)_5%,var(--color-card))]">
              <th className="pl-6 pr-4">Effective</th>
              <th className="pr-4">Base pay</th>
              <th className="pr-4">Total comp</th>
              <th className="pr-4">Compa-ratio</th>
              <th className="pr-6 pl-4 text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const pct = pctById.get(entry.id) ?? null;
              return (
                <tr
                  key={entry.id}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="py-2.5 pl-6 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-foreground">
                        {formatFullDate(entry.effectiveDate)}
                      </span>
                      {entry.isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                          <Check className="size-3" />
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-foreground">
                    {formatMoney(entry.baseLocal, entry.currencyCode)}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-foreground">
                    {formatMoney(entry.totalLocal, entry.currencyCode)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <CompaBadge
                      ratio={entry.compaRatio}
                      placement={entry.bandPlacement}
                    />
                  </td>
                  <td className="py-2.5 pr-6 pl-4 text-right">
                    {pct != null ? (
                      <span
                        className={cn(
                          "text-xs font-medium tabular-nums",
                          pct > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : pct < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-muted-foreground",
                        )}
                      >
                        {pct > 0 ? "+" : ""}
                        {pct}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
}
