"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

/**
 * Every URL param owned by a filter-bar control. The single "Clear filters"
 * button wipes all of these at once (and resets pagination). Sorting and page
 * size are deliberately preserved — they aren't filters. `cur` (display
 * currency) is intentionally excluded: it's a view/formatting preference, not a
 * data filter, so clearing filters shouldn't change how money is shown. Keep
 * this in sync as new facets are added.
 */
const FILTER_PARAMS = [
  "q",
  "field",
  "salMin",
  "salMax",
  "compMin",
  "compMax",
  "crMin",
  "crMax",
  "level",
  "status",
  "gender",
  "mode",
  "hireFrom",
  "hireTo",
  "effFrom",
  "effTo",
];

/** Clears all active filters in one action; hidden when nothing is applied. */
export function ClearFiltersButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const hasActiveFilters = FILTER_PARAMS.some((k) => searchParams.get(k));
  if (!hasActiveFilters) return null;

  const onClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_PARAMS) params.delete(key);
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  return (
    <button
      type="button"
      onClick={onClear}
      disabled={isPending}
      className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xs border border-border/60 bg-[color-mix(in_oklab,var(--color-primary)_5%,var(--color-background))] px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
    >
      <X className="size-4" />
      Clear
    </button>
  );
}
