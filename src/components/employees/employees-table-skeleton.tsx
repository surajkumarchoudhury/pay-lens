/**
 * Loading placeholder for the employees results while a new page streams in.
 * Mirrors the table + pagination layout so the filter bar stays put and the
 * content area doesn't jump. Rendered as the Suspense fallback on any
 * result-affecting param change (search, sort, paging, currency, filters).
 */
export function EmployeesTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <>
      <div className="mt-4 min-h-0 flex-1">
        <div className="h-full overflow-hidden rounded-xs border border-border/60 bg-card">
          {/* Header row */}
          <div className="flex h-10 items-center gap-4 border-b border-border/60 bg-[color-mix(in_oklab,var(--color-primary)_5%,var(--color-card))] px-4">
            {HEADER_WIDTHS.map((w, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-muted-foreground/20"
                style={{ width: w }}
              />
            ))}
          </div>

          {/* Body rows */}
          <div aria-hidden className="animate-pulse">
            {Array.from({ length: rows }).map((_, r) => (
              <div
                key={r}
                className="flex h-11 items-center gap-4 border-b border-border/60 px-4 last:border-0"
              >
                {/* Name cell: avatar + two stacked lines */}
                <div className="flex min-w-[240px] items-center gap-2.5">
                  <div className="size-7 shrink-0 rounded-xs bg-muted-foreground/20" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 rounded bg-muted-foreground/20" />
                    <div className="h-2.5 w-36 rounded bg-muted-foreground/10" />
                  </div>
                </div>
                {CELL_WIDTHS.map((w, c) => (
                  <div
                    key={c}
                    className="h-3 rounded bg-muted-foreground/15"
                    style={{ width: w }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="-mx-4 shrink-0 border-t bg-background px-6 pt-3">
        <div className="flex h-9 items-center justify-between">
          <div className="h-3 w-48 animate-pulse rounded bg-muted-foreground/20" />
          <div className="h-3 w-40 animate-pulse rounded bg-muted-foreground/20" />
        </div>
      </div>
    </>
  );
}

const HEADER_WIDTHS = ["120px", "180px", "60px", "120px", "110px", "90px", "120px", "80px"];
const CELL_WIDTHS = ["150px", "70px", "110px", "110px", "90px", "120px", "90px"];
