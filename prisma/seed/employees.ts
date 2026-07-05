import type { PrismaClient, Prisma, Gender, EmployeeStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { toUsd, annualize, fromUsd, round2 } from "../../src/lib/money";
import { compaRatio } from "../../src/lib/salary-bands";
import { type Level, buildTitle, targetAnnualUsd } from "./salaryBands";
import { avatarUrl, type ReferenceData } from "./reference";

/** Round to 4 decimals — the precision of the stored compaRatio column. */
function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

const DEFAULT_COUNT = 10_000;
const CHUNK = 2_000;
const HISTORY_RATE = 0.2; // fraction of employees with a prior (raised-from) record

// The first RICH_HISTORY_COUNT employees get a deep salary history (a long chain
// of raises) so the detail page's history table has substantial data to show.
const RICH_HISTORY_COUNT = 100;
const RICH_MIN_RECORDS = 15;
const RICH_MAX_RECORDS = 20;

// Weighted distributions — a realistic pyramid, mixed gender, mostly active.
const LEVEL_WEIGHTS: { weight: number; value: Level }[] = [
  { weight: 24, value: "L1" },
  { weight: 24, value: "L2" },
  { weight: 20, value: "L3" },
  { weight: 14, value: "L4" },
  { weight: 10, value: "L5" },
  { weight: 6, value: "L6" },
  { weight: 2, value: "L7" },
];

const GENDER_WEIGHTS: { weight: number; value: Gender }[] = [
  { weight: 47, value: "MALE" },
  { weight: 45, value: "FEMALE" },
  { weight: 5, value: "OTHER" },
  { weight: 3, value: "UNDISCLOSED" },
];

const STATUS_WEIGHTS: { weight: number; value: EmployeeStatus }[] = [
  { weight: 92, value: "ACTIVE" },
  { weight: 5, value: "ON_LEAVE" },
  { weight: 3, value: "TERMINATED" },
];

const FREQ_WEIGHTS = [
  { weight: 85, value: "Annual" },
  { weight: 15, value: "Monthly" },
];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Build one salary record's monetary fields for a given target annual USD.
 * Keeps annualizedUsd as the canonical annual-USD comparison value regardless
 * of the pay frequency.
 */
function buildComp(
  annualBaseUsd: number,
  rateToUsd: number,
  annualFactor: number,
  level: Level,
  countryIso2: string,
) {
  const bonusRatio = faker.number.float({ min: 0, max: 0.25 });
  const localBaseAnnual = fromUsd(annualBaseUsd, rateToUsd);
  const localTotalAnnual = round2(localBaseAnnual * (1 + bonusRatio));

  const basePay = round2(localBaseAnnual / annualFactor);
  const totalComp = round2(localTotalAnnual / annualFactor);
  const basePayUsd = toUsd(basePay, rateToUsd);
  const annualizedUsd = annualize(basePayUsd, annualFactor);
  const annualizedTotalUsd = annualize(toUsd(totalComp, rateToUsd), annualFactor);
  // Denormalized so the app can filter/sort by band position without recomputing
  // (compaRatio can't be null here: every seeded level/country has a midpoint).
  const ratio = round4(compaRatio(annualizedUsd, level, countryIso2) ?? 1);

  return {
    basePay,
    totalComp,
    basePayUsd,
    annualizedUsd,
    annualizedTotalUsd,
    compaRatio: ratio,
  };
}

/** Shape a computed comp into a SalaryRecord row (one per history entry). */
function toRecord(
  employeeId: string,
  comp: ReturnType<typeof buildComp>,
  currencyCode: string,
  frequencyId: string,
  effectiveDate: Date,
  isCurrent: boolean,
): Prisma.SalaryRecordCreateManyInput {
  return {
    id: faker.string.uuid(),
    employeeId,
    basePay: comp.basePay,
    totalComp: comp.totalComp,
    currencyCode,
    frequencyId,
    basePayUsd: comp.basePayUsd,
    annualizedUsd: comp.annualizedUsd,
    annualizedTotalUsd: comp.annualizedTotalUsd,
    compaRatio: comp.compaRatio,
    effectiveDate,
    isCurrent,
  };
}

/** `n` ascending effective dates, the first pinned to the hire date. */
function ascendingDates(from: Date, n: number): Date[] {
  const now = new Date();
  const dates = [from];
  for (let k = 1; k < n; k++) {
    dates.push(faker.date.between({ from, to: now }));
  }
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

export async function seedEmployees(
  prisma: PrismaClient,
  ref: ReferenceData,
  count = Number(process.env.EMPLOYEE_COUNT) || DEFAULT_COUNT,
): Promise<{ employees: number; salaryRecords: number }> {
  const rateFor = (code: string) => ref.currencyRates.get(code) ?? 1;
  const freqByLabel = new Map(ref.frequencies.map((f) => [f.label, f]));

  const employees: Prisma.EmployeeCreateManyInput[] = [];
  const salaryRecords: Prisma.SalaryRecordCreateManyInput[] = [];

  for (let i = 0; i < count; i++) {
    const country = faker.helpers.arrayElement(ref.countries);
    const department = faker.helpers.arrayElement(ref.departments);
    const level = faker.helpers.weightedArrayElement(LEVEL_WEIGHTS);
    const gender = faker.helpers.weightedArrayElement(GENDER_WEIGHTS);
    const status = faker.helpers.weightedArrayElement(STATUS_WEIGHTS);

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    // Rich-history employees hired further back, so 15-20 raises can spread out.
    const isRich = i < RICH_HISTORY_COUNT;
    const hireDate = faker.date.past({
      years: isRich ? faker.number.int({ min: 5, max: 8 }) : 8,
    });
    const dob = faker.date.birthdate({ min: 22, max: 60, mode: "age" });

    const employeeId = faker.string.uuid();

    employees.push({
      id: employeeId,
      employeeNumber: `ACME-${String(i + 1).padStart(5, "0")}`,
      firstName,
      lastName,
      email: `${slug(firstName)}.${slug(lastName)}.${i}@acme.com`,
      avatarUrl: avatarUrl(`${firstName} ${lastName}`),
      gender,
      title: buildTitle(department.name, level),
      level,
      status,
      isRemote: faker.datatype.boolean(0.35),
      hireDate,
      dob,
      countryIso2: country.iso2,
      departmentId: department.id,
    });

    // Compensation. `annualBaseUsd` is the current (latest) target; rate and
    // frequency are shared by every record in an employee's history chain.
    const jitter = faker.number.float({ min: 0.85, max: 1.15 });
    const annualBaseUsd = round2(targetAnnualUsd(level, country.iso2) * jitter);
    const rate = rateFor(country.currencyCode);
    const freq = faker.helpers.weightedArrayElement(FREQ_WEIGHTS);
    const frequency = freqByLabel.get(freq)!;
    const annualFactor = frequency.annualFactor;

    if (isRich) {
      // A deep history: a chain of raises from a lower starting base up to the
      // current pay, on ascending effective dates from hire to today.
      const n = faker.number.int({ min: RICH_MIN_RECORDS, max: RICH_MAX_RECORDS });
      const dates = ascendingDates(hireDate, n);
      const startBaseUsd = round2(
        annualBaseUsd * faker.number.float({ min: 0.45, max: 0.6 }),
      );
      for (let k = 0; k < n; k++) {
        const t = n === 1 ? 1 : k / (n - 1);
        // Geometric growth from start -> current, with slight per-step jitter.
        const grown = startBaseUsd * (annualBaseUsd / startBaseUsd) ** t;
        const isLatest = k === n - 1;
        const baseUsd = isLatest
          ? annualBaseUsd
          : round2(grown * faker.number.float({ min: 0.98, max: 1.02 }));
        const comp = buildComp(baseUsd, rate, annualFactor, level, country.iso2);
        salaryRecords.push(
          toRecord(
            employeeId,
            comp,
            country.currencyCode,
            frequency.id,
            dates[k],
            isLatest,
          ),
        );
      }
    } else {
      const current = buildComp(annualBaseUsd, rate, annualFactor, level, country.iso2);
      const hasHistory = faker.datatype.boolean(HISTORY_RATE);
      const currentEffective = hasHistory
        ? faker.date.between({ from: hireDate, to: new Date() })
        : hireDate;
      salaryRecords.push(
        toRecord(
          employeeId,
          current,
          country.currencyCode,
          frequency.id,
          currentEffective,
          true,
        ),
      );

      // Optional prior record (a single raise): lower pay, effective at hire.
      if (hasHistory) {
        const priorBaseUsd = round2(
          annualBaseUsd * faker.number.float({ min: 0.8, max: 0.94 }),
        );
        const prior = buildComp(priorBaseUsd, rate, annualFactor, level, country.iso2);
        salaryRecords.push(
          toRecord(
            employeeId,
            prior,
            country.currencyCode,
            frequency.id,
            hireDate,
            false,
          ),
        );
      }
    }
  }

  // Batched inserts keep 10k fast.
  for (let i = 0; i < employees.length; i += CHUNK) {
    await prisma.employee.createMany({ data: employees.slice(i, i + CHUNK) });
  }
  for (let i = 0; i < salaryRecords.length; i += CHUNK) {
    await prisma.salaryRecord.createMany({ data: salaryRecords.slice(i, i + CHUNK) });
  }

  return { employees: employees.length, salaryRecords: salaryRecords.length };
}
