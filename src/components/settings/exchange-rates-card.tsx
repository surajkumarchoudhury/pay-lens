import type { CurrencyOption } from "@/lib/employees";
import { cn } from "@/lib/utils";

/** 1 unit of the currency expressed in USD, e.g. "$0.012". */
function formatRate(rateToUsd: number): string {
  return `$${rateToUsd.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`;
}

/**
 * Read-only reference of the stored FX snapshot. Rates are the value of one
 * unit of each currency in USD and back the cross-currency normalization used
 * across the app; the organization's base currency is flagged.
 */
export function ExchangeRatesCard({
  currencies,
  baseCurrency,
}: {
  currencies: CurrencyOption[];
  baseCurrency: string;
}) {
  return (
    <section>
      <h2 className="mb-1 text-base font-semibold text-foreground">
        Exchange rates
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Stored FX snapshot used to normalize compensation across currencies.
      </p>

      <div className="overflow-hidden rounded-xs border border-border/60 bg-card">
        <table className="w-full text-sm text-foreground">
          <thead>
            <tr className="text-left font-semibold [&>th]:border-b [&>th]:border-border/60 [&>th]:bg-[color-mix(in_oklab,var(--color-primary)_5%,var(--color-card))] [&>th]:px-4 [&>th]:py-2.5">
              <th className="w-28">Code</th>
              <th>Currency</th>
              <th className="w-24">Symbol</th>
              <th className="w-48 text-right">Rate to USD</th>
            </tr>
          </thead>
          <tbody>
            {currencies.map((c) => {
              const isBase = c.code === baseCurrency;
              return (
                <tr
                  key={c.code}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="font-medium tabular-nums">{c.code}</span>
                      {isBase && (
                        <span className="rounded-xs bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Base
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.name}</td>
                  <td className="px-4 py-2.5 tabular-nums">{c.symbol}</td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right tabular-nums",
                      isBase && "font-medium",
                    )}
                  >
                    {formatRate(c.rateToUsd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
