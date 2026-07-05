"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";

import { CURRENCY_PARAM } from "@/components/employees/currency-select";
import { Input } from "@/components/ui/input";
import type { CurrencyOption } from "@/lib/employees";
import { cn } from "@/lib/utils";

export type CompensationValues = {
  salaryMin: string;
  salaryMax: string;
  totalCompMin: string;
  totalCompMax: string;
  compaMin: string;
  compaMax: string;
};

function symbolFor(currencies: CurrencyOption[], code: string): string {
  return currencies.find((c) => c.code === code)?.symbol ?? "$";
}

/** How many of the three ranges have at least one bound set. */
function activeCount(v: CompensationValues): number {
  const pairs: [string, string][] = [
    [v.salaryMin, v.salaryMax],
    [v.totalCompMin, v.totalCompMax],
    [v.compaMin, v.compaMax],
  ];
  return pairs.filter(([lo, hi]) => lo || hi).length;
}

/** Order a min/max pair, dropping blanks; swaps if the user inverted them. */
function normalize(min: string, max: string): [string, string] {
  let lo = min.trim();
  let hi = max.trim();
  if (lo && hi && Number(lo) > Number(hi)) [lo, hi] = [hi, lo];
  return [lo, hi];
}

/**
 * Single "Compensation" popover grouping the three comp ranges (base pay, total
 * comp, compa-ratio) behind one trigger + Apply, to keep the filter bar
 * uncluttered. Money ranges are entered in the shared display currency (`cur`)
 * and converted to USD server-side; compa-ratio is unitless. All six bounds are
 * drafts committed together on Apply. Owns salMin/salMax, compMin/compMax and
 * crMin/crMax.
 */
export function CompensationFilter({
  currencies,
  values,
}: {
  currencies: CurrencyOption[];
  values: CompensationValues;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currency = searchParams.get(CURRENCY_PARAM);
  const unitSymbol = symbolFor(currencies, currency ?? "USD");

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CompensationValues>(values);

  const set = (key: keyof CompensationValues, v: string) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const count = activeCount(values);
  const isActive = count > 0;

  const onApply = () => {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    const commit = (minKey: string, maxKey: string, min: string, max: string) => {
      const [lo, hi] = normalize(min, max);
      if (lo) params.set(minKey, lo);
      else params.delete(minKey);
      if (hi) params.set(maxKey, hi);
      else params.delete(maxKey);
    };
    commit("salMin", "salMax", draft.salaryMin, draft.salaryMax);
    commit("compMin", "compMax", draft.totalCompMin, draft.totalCompMax);
    commit("crMin", "crMax", draft.compaMin, draft.compaMax);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

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
            Compensation
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
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-sm font-semibold">Compensation</span>
            <span className="text-xs text-muted-foreground">
              amounts in {currency ?? "USD"}
            </span>
          </div>

          <div className="space-y-4">
            <MoneyRow
              label="Base pay"
              symbol={unitSymbol}
              min={draft.salaryMin}
              max={draft.salaryMax}
              onMin={(v) => set("salaryMin", v)}
              onMax={(v) => set("salaryMax", v)}
            />
            <MoneyRow
              label="Total comp"
              symbol={unitSymbol}
              min={draft.totalCompMin}
              max={draft.totalCompMax}
              onMin={(v) => set("totalCompMin", v)}
              onMax={(v) => set("totalCompMax", v)}
            />
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-xs font-medium text-foreground">
                  Compa-ratio
                </span>
                <span className="text-[11px] text-muted-foreground">
                  1.00 = band midpoint
                </span>
              </div>
              <RangeInputs
                min={draft.compaMin}
                max={draft.compaMax}
                onMin={(v) => set("compaMin", v)}
                onMax={(v) => set("compaMax", v)}
                step={0.05}
                inputMode="decimal"
                minPlaceholder="0.00"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onApply}
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

function MoneyRow({
  label,
  symbol,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string;
  symbol: string;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-foreground">
        {label}
      </span>
      <RangeInputs
        min={min}
        max={max}
        onMin={onMin}
        onMax={onMax}
        prefix={symbol}
        inputMode="numeric"
        minPlaceholder="0"
      />
    </div>
  );
}

function RangeInputs({
  min,
  max,
  onMin,
  onMax,
  prefix,
  step,
  inputMode,
  minPlaceholder,
}: {
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  prefix?: string;
  step?: number;
  inputMode: "numeric" | "decimal";
  minPlaceholder: string;
}) {
  const pad = prefix ? "pl-6 pr-2" : "px-2";
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        {prefix && (
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          min={0}
          step={step}
          inputMode={inputMode}
          value={min}
          onChange={(e) => onMin(e.target.value)}
          placeholder={minPlaceholder}
          aria-label="Minimum"
          className={cn("h-9", pad)}
        />
      </div>
      <span className="text-muted-foreground">–</span>
      <div className="relative flex-1">
        {prefix && (
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="number"
          min={0}
          step={step}
          inputMode={inputMode}
          value={max}
          onChange={(e) => onMax(e.target.value)}
          placeholder="Any"
          aria-label="Maximum"
          className={cn("h-9", pad)}
        />
      </div>
    </div>
  );
}
