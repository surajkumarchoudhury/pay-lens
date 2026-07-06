"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

import type { CurrencyOption } from "@/lib/employees";
import { cn } from "@/lib/utils";

/** URL param holding the shared display / salary-range currency. */
export const CURRENCY_PARAM = "cur";

/** Sentinel radio value for "Local" (each row's own native currency). */
const ORIGINAL = "__original__";

/**
 * Shared source of truth for the currency used across the page — both the
 * salary column's display and the salary range filter's unit. Lives in the URL
 * (`cur`) like every other filter, so the two controls stay in sync for free
 * and the selection survives refresh / sharing / back-forward.
 *
 * `null` means "Local" (native currencies; the range filter then falls back
 * to USD as its base unit). Changing it only resets pagination when a salary
 * range is active, since otherwise the row set is unchanged.
 */
export function useCurrencyParam(): [string | null, (next: string | null) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = searchParams.get(CURRENCY_PARAM);

  const setValue = (next: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(CURRENCY_PARAM, next);
    else params.delete(CURRENCY_PARAM);
    if (params.get("salMin") || params.get("salMax")) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return [value, setValue];
}

function symbolFor(currencies: CurrencyOption[], code: string | null): string {
  if (!code) return "";
  return currencies.find((c) => c.code === code)?.symbol ?? "";
}

/**
 * Currency picker rendered as a Radix dropdown. `pill` is the compact form for
 * the table header; `field` is the full-width form control for the filter
 * popover. Both share identical options and styling.
 */
export function CurrencySelect({
  value,
  onChange,
  currencies,
  orgCurrencyCode,
  variant = "pill",
  ariaLabel = "Display currency",
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  currencies: CurrencyOption[];
  orgCurrencyCode: string;
  variant?: "pill" | "field" | "bar";
  ariaLabel?: string;
}) {
  const active = value !== null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {variant === "bar" ? (
          // Neutral styling (like the other view controls): currency is a
          // display preference, not a clearable filter, so no active/blue state.
          <button
            type="button"
            aria-label={ariaLabel}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-xs border border-input px-3 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <span className="text-muted-foreground">Currency</span>
            <span className="font-medium">{value ?? "Local"}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
        ) : variant === "pill" ? (
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "inline-flex h-5 cursor-pointer items-center gap-1 rounded-full border px-2 text-[11px] font-medium leading-none transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/70 text-muted-foreground hover:border-primary/60 hover:text-foreground",
            )}
          >
            {value ?? "Local"}
            <ChevronDown className="size-3" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={ariaLabel}
            className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-xs border border-input bg-transparent px-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {value ? (
              <>
                <span className="text-muted-foreground">
                  {symbolFor(currencies, value)}
                </span>
                <span className="font-medium">{value}</span>
              </>
            ) : (
              <span>Local</span>
            )}
            <ChevronDown className="ml-auto size-4 text-muted-foreground" />
          </button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 max-h-72 overflow-auto rounded-md bg-popover p-1 text-popover-foreground shadow-md focus-visible:outline-none",
            variant === "field"
              ? "min-w-40 w-(--radix-dropdown-menu-trigger-width)"
              : "w-40",
          )}
        >
          <DropdownMenu.RadioGroup
            value={value ?? ORIGINAL}
            onValueChange={(v) => onChange(v === ORIGINAL ? null : v)}
          >
            <CurrencyRadioItem value={ORIGINAL}>
              <span className="font-medium">Local</span>
            </CurrencyRadioItem>
            <DropdownMenu.Separator className="my-1 h-px bg-border/60" />
            {currencies.map((c) => (
              <CurrencyRadioItem key={c.code} value={c.code}>
                <span className="w-6 text-muted-foreground">{c.symbol}</span>
                <span className="font-medium">{c.code}</span>
                {c.code === orgCurrencyCode && (
                  <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    org
                  </span>
                )}
              </CurrencyRadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function CurrencyRadioItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.RadioItem
      value={value}
      className="flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none transition-colors data-highlighted:bg-muted"
    >
      <span className="grid w-4 shrink-0 place-items-center">
        <DropdownMenu.ItemIndicator>
          <Check className="size-3.5 text-primary" />
        </DropdownMenu.ItemIndicator>
      </span>
      {children}
    </DropdownMenu.RadioItem>
  );
}
