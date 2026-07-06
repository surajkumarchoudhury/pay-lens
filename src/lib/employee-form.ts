import "server-only";

import { prisma } from "@/lib/prisma";
import type { CurrencyOption } from "@/lib/employees";

/** Reference data needed to render the create-employee form's selects. */
export type EmployeeFormReference = {
  departments: { id: string; name: string }[];
  countries: { iso2: string; name: string; currencyCode: string }[];
  frequencies: { id: string; label: string; annualFactor: number }[];
  currencies: CurrencyOption[];
};

export async function getEmployeeFormReference(): Promise<EmployeeFormReference> {
  const [departments, countries, frequencies, currencies] = await Promise.all([
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.country.findMany({
      select: { iso2: true, name: true, currencyCode: true },
      orderBy: { name: "asc" },
    }),
    prisma.compensationFrequency.findMany({
      select: { id: true, label: true, annualFactor: true },
      orderBy: { annualFactor: "asc" },
    }),
    prisma.currency.findMany({
      select: { code: true, symbol: true, name: true, rateToUsd: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return {
    departments,
    countries,
    frequencies,
    currencies: currencies.map((c) => ({
      code: c.code,
      symbol: c.symbol,
      name: c.name,
      rateToUsd: Number(c.rateToUsd),
    })),
  };
}
