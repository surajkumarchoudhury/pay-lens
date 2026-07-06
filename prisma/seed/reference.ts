import type {
  PrismaClient,
  Currency,
  Department,
  CompensationFrequency,
} from "@prisma/client";

/**
 * Reference / lookup data. Seeded via upsert so it is safe to re-run.
 * FX rates are a fixed snapshot (rateToUsd = USD value of 1 unit) so that
 * currency normalization is deterministic and testable.
 */

/** Deterministic initials avatar (no file storage, no real photos). */
export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}`;
}

export const ORG = {
  name: "ACME Corporation",
  baseCurrency: "USD",
  avatarUrl: avatarUrl("ACME Corporation"),
};

export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", rateToUsd: 1.0 },
  { code: "EUR", name: "Euro", symbol: "€", rateToUsd: 1.08 },
  { code: "GBP", name: "British Pound", symbol: "£", rateToUsd: 1.27 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rateToUsd: 0.012 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rateToUsd: 0.73 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rateToUsd: 0.66 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rateToUsd: 0.74 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", rateToUsd: 0.2 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rateToUsd: 0.0067 },
  { code: "ZAR", name: "South African Rand", symbol: "R", rateToUsd: 0.053 },
];

/** Country -> its default currency. Also drives per-employee salary currency. */
export const COUNTRIES = [
  { iso2: "US", name: "United States", currencyCode: "USD" },
  { iso2: "GB", name: "United Kingdom", currencyCode: "GBP" },
  { iso2: "IN", name: "India", currencyCode: "INR" },
  { iso2: "DE", name: "Germany", currencyCode: "EUR" },
  { iso2: "FR", name: "France", currencyCode: "EUR" },
  { iso2: "CA", name: "Canada", currencyCode: "CAD" },
  { iso2: "AU", name: "Australia", currencyCode: "AUD" },
  { iso2: "SG", name: "Singapore", currencyCode: "SGD" },
  { iso2: "BR", name: "Brazil", currencyCode: "BRL" },
  { iso2: "JP", name: "Japan", currencyCode: "JPY" },
  { iso2: "ZA", name: "South Africa", currencyCode: "ZAR" },
];

export const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Finance",
  "HR",
  "Operations",
  "Support",
  "Legal",
];

/**
 * annualFactor converts a per-period amount to an annual amount. We model only
 * salaried pay (Annual/Monthly); hourly pay maps to hourly *contractors*, a
 * different worker classification we intentionally keep out of the employee set.
 */
export const FREQUENCIES = [
  { label: "Annual", annualFactor: 1 },
  { label: "Monthly", annualFactor: 12 },
];

export type ReferenceData = {
  currencyRates: Map<string, number>; // code -> rateToUsd
  countries: { iso2: string; currencyCode: string }[];
  departments: { id: string; name: string }[];
  frequencies: { id: string; label: string; annualFactor: number }[];
};

export async function seedReference(prisma: PrismaClient): Promise<ReferenceData> {
  await prisma.organization.upsert({
    where: { id: "org_acme" },
    update: {
      name: ORG.name,
      baseCurrency: ORG.baseCurrency,
      avatarUrl: ORG.avatarUrl,
    },
    create: {
      id: "org_acme",
      name: ORG.name,
      baseCurrency: ORG.baseCurrency,
      avatarUrl: ORG.avatarUrl,
    },
  });

  for (const c of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: { name: c.name, symbol: c.symbol, rateToUsd: c.rateToUsd },
      create: c,
    });
  }

  for (const c of COUNTRIES) {
    await prisma.country.upsert({
      where: { iso2: c.iso2 },
      update: { name: c.name, currencyCode: c.currencyCode },
      create: c,
    });
  }

  for (const name of DEPARTMENTS) {
    await prisma.department.upsert({
      where: { name },
      update: { avatarUrl: avatarUrl(name) },
      create: { name, avatarUrl: avatarUrl(name) },
    });
  }

  for (const f of FREQUENCIES) {
    await prisma.compensationFrequency.upsert({
      where: { label: f.label },
      update: { annualFactor: f.annualFactor },
      create: f,
    });
  }

  const [currencies, departments, frequencies] = await Promise.all([
    prisma.currency.findMany(),
    prisma.department.findMany(),
    prisma.compensationFrequency.findMany(),
  ]);

  return {
    currencyRates: new Map(
      currencies.map((c: Currency) => [c.code, Number(c.rateToUsd)]),
    ),
    countries: COUNTRIES.map(({ iso2, currencyCode }) => ({ iso2, currencyCode })),
    departments: departments.map((d: Department) => ({ id: d.id, name: d.name })),
    frequencies: frequencies.map((f: CompensationFrequency) => ({
      id: f.id,
      label: f.label,
      annualFactor: f.annualFactor,
    })),
  };
}
