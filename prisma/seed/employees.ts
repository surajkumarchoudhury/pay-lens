import type { PrismaClient, Prisma, Gender, EmployeeStatus } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { toUsd, annualize, fromUsd, round2 } from "../../src/lib/money";
import { type Level, buildTitle, targetAnnualUsd } from "./salaryBands";
import { avatarUrl, type ReferenceData } from "./reference";

const DEFAULT_COUNT = 10_000;
const CHUNK = 2_000;
const HISTORY_RATE = 0.2; // fraction of employees with a prior (raised-from) record

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
  { weight: 80, value: "Annual" },
  { weight: 15, value: "Monthly" },
  { weight: 5, value: "Hourly" },
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
) {
  const bonusRatio = faker.number.float({ min: 0, max: 0.25 });
  const localBaseAnnual = fromUsd(annualBaseUsd, rateToUsd);
  const localTotalAnnual = round2(localBaseAnnual * (1 + bonusRatio));

  const basePay = round2(localBaseAnnual / annualFactor);
  const totalComp = round2(localTotalAnnual / annualFactor);
  const basePayUsd = toUsd(basePay, rateToUsd);
  const annualizedUsd = annualize(basePayUsd, annualFactor);

  return { basePay, totalComp, basePayUsd, annualizedUsd };
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
    const hireDate = faker.date.past({ years: 8 });
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

    // Compensation for the current record.
    const jitter = faker.number.float({ min: 0.85, max: 1.15 });
    const annualBaseUsd = round2(targetAnnualUsd(level, country.iso2) * jitter);
    const rate = rateFor(country.currencyCode);
    const freq = faker.helpers.weightedArrayElement(FREQ_WEIGHTS);
    const frequency = freqByLabel.get(freq)!;

    const current = buildComp(annualBaseUsd, rate, frequency.annualFactor);
    const hasHistory = faker.datatype.boolean(HISTORY_RATE);
    const currentEffective = hasHistory
      ? faker.date.between({ from: hireDate, to: new Date() })
      : hireDate;

    salaryRecords.push({
      id: faker.string.uuid(),
      employeeId,
      basePay: current.basePay,
      totalComp: current.totalComp,
      currencyCode: country.currencyCode,
      frequencyId: frequency.id,
      basePayUsd: current.basePayUsd,
      annualizedUsd: current.annualizedUsd,
      effectiveDate: currentEffective,
      isCurrent: true,
    });

    // Optional prior record (a raise): lower pay, effective at hire.
    if (hasHistory) {
      const priorBaseUsd = round2(annualBaseUsd * faker.number.float({ min: 0.8, max: 0.94 }));
      const prior = buildComp(priorBaseUsd, rate, frequency.annualFactor);
      salaryRecords.push({
        id: faker.string.uuid(),
        employeeId,
        basePay: prior.basePay,
        totalComp: prior.totalComp,
        currencyCode: country.currencyCode,
        frequencyId: frequency.id,
        basePayUsd: prior.basePayUsd,
        annualizedUsd: prior.annualizedUsd,
        effectiveDate: hireDate,
        isCurrent: false,
      });
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
