"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DateFilterValues = {
  hireDateFrom: string;
  hireDateTo: string;
  effectiveDateFrom: string;
  effectiveDateTo: string;
};

/** How many of the two ranges have at least one bound set (0–2). */
function activeCount(v: DateFilterValues): number {
  const pairs: [string, string][] = [
    [v.hireDateFrom, v.hireDateTo],
    [v.effectiveDateFrom, v.effectiveDateTo],
  ];
  return pairs.filter(([lo, hi]) => lo || hi).length;
}

/** Order a from/to pair, dropping blanks; swaps if the user inverted them. */
function normalize(from: string, to: string): [string, string] {
  let lo = from.trim();
  let hi = to.trim();
  if (lo && hi && lo > hi) [lo, hi] = [hi, lo];
  return [lo, hi];
}

/**
 * Single "Dates" popover grouping the two date ranges (hire date, effective
 * date) behind one trigger + Apply — mirrors the Compensation filter to keep the
 * bar uncluttered. Hire date filters the employee; effective date filters when
 * the current comp took effect. Owns hireFrom/hireTo and effFrom/effTo.
 */
export function DateFilter({ values }: { values: DateFilterValues }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateFilterValues>(values);

  // Nobody is hired / paid in the future, so cap every bound at today.
  const today = new Date().toISOString().slice(0, 10);

  const count = activeCount(values);
  const isActive = count > 0;

  const set = (key: keyof DateFilterValues, v: string) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const commit = (next: DateFilterValues) => {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    const apply = (
      fromKey: string,
      toKey: string,
      from: string,
      to: string,
    ) => {
      const [lo, hi] = normalize(from, to);
      if (lo) params.set(fromKey, lo);
      else params.delete(fromKey);
      if (hi) params.set(toKey, hi);
      else params.delete(toKey);
    };
    apply("hireFrom", "hireTo", next.hireDateFrom, next.hireDateTo);
    apply("effFrom", "effTo", next.effectiveDateFrom, next.effectiveDateTo);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const empty: DateFilterValues = {
    hireDateFrom: "",
    hireDateTo: "",
    effectiveDateFrom: "",
    effectiveDateTo: "",
  };
  const canClear =
    draft.hireDateFrom ||
    draft.hireDateTo ||
    draft.effectiveDateFrom ||
    draft.effectiveDateTo;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(values);
        setOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xs border px-3 text-sm transition-colors",
            isActive
              ? "border-primary bg-primary/10 text-foreground"
              : "border-input text-foreground hover:bg-muted",
          )}
        >
          <span className={isActive ? "font-medium" : "text-muted-foreground"}>
            Dates
          </span>
          {isActive && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {count}
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-80 rounded-md bg-popover p-4 text-popover-foreground shadow-md focus-visible:outline-none"
        >
          <div className="mb-4 text-sm font-semibold">Dates</div>

          <div className="space-y-4">
            <DateRange
              label="Hire date"
              from={draft.hireDateFrom}
              to={draft.hireDateTo}
              max={today}
              onFrom={(v) => set("hireDateFrom", v)}
              onTo={(v) => set("hireDateTo", v)}
            />
            <DateRange
              label="Effective date"
              from={draft.effectiveDateFrom}
              to={draft.effectiveDateTo}
              max={today}
              onFrom={(v) => set("effectiveDateFrom", v)}
              onTo={(v) => set("effectiveDateTo", v)}
            />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setDraft(empty);
                commit(empty);
              }}
              className={cn(
                "text-xs text-muted-foreground transition-colors hover:text-foreground",
                !canClear && "invisible",
              )}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => commit(draft)}
              className="inline-flex h-8 cursor-pointer items-center rounded-xs bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Apply
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function DateRange({
  label,
  from,
  to,
  max,
  onFrom,
  onTo,
}: {
  label: string;
  from: string;
  to: string;
  max: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label={`${label} from`}
          value={from}
          max={to || max}
          onChange={(e) => onFrom(e.target.value)}
          className="h-9 min-w-0 flex-1 px-2 text-xs"
        />
        <span className="shrink-0 text-muted-foreground">–</span>
        <Input
          type="date"
          aria-label={`${label} to`}
          value={to}
          min={from || undefined}
          max={max}
          onChange={(e) => onTo(e.target.value)}
          className="h-9 min-w-0 flex-1 px-2 text-xs"
        />
      </div>
    </div>
  );
}
