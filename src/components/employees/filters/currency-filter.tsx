"use client";

import {
  CurrencySelect,
  useCurrencyParam,
} from "@/components/employees/currency-select";
import type { CurrencyOption } from "@/lib/employees";

/**
 * Global display-currency control. It's a view/formatting preference (grouped
 * with the other view controls, not the filters): it drives every money column
 * (Annual base, Total comp) *and* the unit the compensation range filters are
 * entered in — one shared `cur` URL param, so display and filtering never
 * disagree. "Local" shows each row in its own native currency.
 */
export function CurrencyFilter({
  currencies,
  orgCurrencyCode,
}: {
  currencies: CurrencyOption[];
  orgCurrencyCode: string;
}) {
  const [value, setValue] = useCurrencyParam();

  return (
    <CurrencySelect
      value={value}
      onChange={setValue}
      currencies={currencies}
      orgCurrencyCode={orgCurrencyCode}
      variant="bar"
    />
  );
}
