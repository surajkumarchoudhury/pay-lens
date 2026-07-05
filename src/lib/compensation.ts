/**
 * Compensation math for *writing* a salary record — the single source of truth
 * for the denormalized USD / compa-ratio columns. Mirrors the seed's `buildComp`
 * so a record created by an HR manager is byte-for-byte consistent with seeded
 * data. Kept dependency-free (no `server-only`, no Prisma) so it can be unit
 * tested and reused client-side for a live preview.
 */

import { annualize, round2, toUsd } from "./money";
import { compaRatio, type Level } from "./salary-bands";

export type SalaryFieldsInput = {
  /** New annual base pay in the employee's own (local) currency. */
  annualBaseLocal: number;
  /** New annual total comp in the employee's own (local) currency. */
  annualTotalLocal: number;
  /** Value of 1 unit of the local currency in USD. */
  rateToUsd: number;
  /** Periods per year for the record's pay frequency (annual=1, monthly=12). */
  annualFactor: number;
  level: Level;
  countryIso2: string;
};

/** The persisted monetary columns of a `SalaryRecord`, all rounded for storage. */
export type SalaryFields = {
  basePay: number; // per-period, local
  totalComp: number; // per-period, local
  basePayUsd: number;
  annualizedUsd: number;
  annualizedTotalUsd: number;
  compaRatio: number;
};

/** Round to 4 decimals — the precision of the stored `compaRatio` column. */
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Derive every stored money column from an annual-local base + total. The stored
 * `basePay`/`totalComp` are per-period (annual ÷ annualFactor) to match how the
 * seed and the record's frequency represent them.
 */
export function buildSalaryFields(input: SalaryFieldsInput): SalaryFields {
  const { annualBaseLocal, annualTotalLocal, rateToUsd, annualFactor } = input;

  const basePay = round2(annualBaseLocal / annualFactor);
  const totalComp = round2(annualTotalLocal / annualFactor);
  const basePayUsd = toUsd(basePay, rateToUsd);
  const annualizedUsd = annualize(basePayUsd, annualFactor);
  const annualizedTotalUsd = annualize(toUsd(totalComp, rateToUsd), annualFactor);
  const ratio = round4(
    compaRatio(annualizedUsd, input.level, input.countryIso2) ?? 1,
  );

  return {
    basePay,
    totalComp,
    basePayUsd,
    annualizedUsd,
    annualizedTotalUsd,
    compaRatio: ratio,
  };
}
