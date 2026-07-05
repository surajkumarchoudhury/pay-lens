import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { seedReference } from "./seed/reference";
import { seedUsers } from "./seed/users";
import { seedEmployees } from "./seed/employees";

/**
 * Idempotent seed. Safe to run locally and in production:
 *  - reference data + users are upserted (re-running is a no-op),
 *  - employees are generated only when the table is empty, unless RESEED=1
 *    forces a clean regenerate.
 *
 * Deterministic: a fixed faker seed means the same data every run.
 */

const prisma = new PrismaClient();
const SEED = Number(process.env.FAKER_SEED) || 20260705;

async function main() {
  faker.seed(SEED);

  console.log("→ Seeding reference data (org, currencies, countries, departments, frequencies)…");
  const ref = await seedReference(prisma);

  console.log("→ Seeding users (HR managers + read-only viewer)…");
  await seedUsers(prisma);

  const existing = await prisma.employee.count();
  const reseed = process.env.RESEED === "1";

  if (existing > 0 && !reseed) {
    console.log(`✓ ${existing} employees already present — skipping generation (set RESEED=1 to regenerate).`);
  } else {
    if (existing > 0 && reseed) {
      console.log(`→ RESEED=1: clearing ${existing} existing employees…`);
      await prisma.salaryRecord.deleteMany();
      await prisma.employee.deleteMany();
    }
    console.log("→ Generating employees + salary records…");
    const { employees, salaryRecords } = await seedEmployees(prisma, ref);
    console.log(`✓ Inserted ${employees} employees and ${salaryRecords} salary records.`);
  }

  await report();
}

async function report() {
  const [byCountry, byGender, users] = await Promise.all([
    prisma.employee.groupBy({ by: ["countryIso2"], _count: true }),
    prisma.employee.groupBy({ by: ["gender"], _count: true }),
    prisma.user.count(),
  ]);
  console.log("\nDistribution by country:", Object.fromEntries(byCountry.map((r) => [r.countryIso2, r._count])));
  console.log("Distribution by gender:", Object.fromEntries(byGender.map((r) => [r.gender, r._count])));
  console.log("Users:", users);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
