"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { buildSalaryFields } from "@/lib/compensation";
import {
  newEmployeeRowSchema,
  type FieldError,
} from "@/lib/employee-schema";
import { prisma } from "@/lib/prisma";
import type { Level } from "@/lib/salary-bands";

export type CreateEmployeesResult = {
  ok: boolean;
  error: string | null;
  /** Field-scoped messages so the client can highlight the exact inputs. */
  fieldErrors?: FieldError[];
  createdCount?: number;
};

function fail(error: string, fieldErrors?: FieldError[]): CreateEmployeesResult {
  return { ok: false, error, fieldErrors };
}

/** Parse the numeric suffix of an "ACME-00042" employee number. */
function numberSuffix(employeeNumber: string | undefined): number {
  if (!employeeNumber) return 0;
  const n = Number(employeeNumber.split("-").pop());
  return Number.isFinite(n) ? n : 0;
}

/**
 * Create one or more employees, each with its initial (current) salary record.
 * Restricted to HR_MANAGER. Validates every row up-front (references + business
 * rules + duplicate emails), auto-assigns sequential employee numbers, and
 * writes everything in a single transaction with a CREATE audit entry per hire.
 */
export async function createEmployees(
  rows: unknown,
): Promise<CreateEmployeesResult> {
  const user = await requireRole("HR_MANAGER");

  const parsed = z
    .array(newEmployeeRowSchema)
    .min(1, "Add at least one employee")
    .max(50, "Add at most 50 employees at a time")
    .safeParse(rows);
  if (!parsed.success) {
    // Map Zod issues to field-scoped errors (path = [rowIndex, field]).
    const fieldErrors: FieldError[] = [];
    let general: string | null = null;
    for (const issue of parsed.error.issues) {
      if (typeof issue.path[0] === "number" && issue.path[1]) {
        fieldErrors.push({
          row: issue.path[0],
          field: String(issue.path[1]),
          message: issue.message,
        });
      } else {
        general = issue.message;
      }
    }
    return fail(general ?? "Please fix the highlighted fields", fieldErrors);
  }
  const data = parsed.data;

  const [departments, countries, frequencies, currencies] = await Promise.all([
    prisma.department.findMany({ select: { id: true } }),
    prisma.country.findMany({ select: { iso2: true } }),
    prisma.compensationFrequency.findMany({
      select: { id: true, annualFactor: true },
    }),
    prisma.currency.findMany({ select: { code: true, rateToUsd: true } }),
  ]);
  const deptSet = new Set(departments.map((d) => d.id));
  const countrySet = new Set(countries.map((c) => c.iso2));
  const freqMap = new Map(frequencies.map((f) => [f.id, f.annualFactor]));
  const rateMap = new Map(currencies.map((c) => [c.code, Number(c.rateToUsd)]));

  const fieldErrors: FieldError[] = [];
  const emailSeen = new Map<string, number>();
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    if (!deptSet.has(r.departmentId)) {
      fieldErrors.push({ row: i, field: "departmentId", message: "Unknown department" });
    }
    if (!countrySet.has(r.countryIso2)) {
      fieldErrors.push({ row: i, field: "countryIso2", message: "Unknown country" });
    }
    if (!freqMap.has(r.frequencyId)) {
      fieldErrors.push({ row: i, field: "frequencyId", message: "Unknown pay frequency" });
    }
    if (!rateMap.has(r.currencyCode)) {
      fieldErrors.push({ row: i, field: "currencyCode", message: "Unknown currency" });
    }
    if (emailSeen.has(r.email)) {
      fieldErrors.push({ row: i, field: "email", message: "Duplicate email in this batch" });
    } else {
      emailSeen.set(r.email, i);
    }
  }

  const existing = await prisma.employee.findMany({
    where: { email: { in: [...emailSeen.keys()] } },
    select: { email: true },
  });
  for (const e of existing) {
    const row = emailSeen.get(e.email);
    if (row != null) {
      fieldErrors.push({ row, field: "email", message: "Email already in use" });
    }
  }

  if (fieldErrors.length > 0) {
    return fail("Please fix the highlighted fields", fieldErrors);
  }

  const last = await prisma.employee.findFirst({
    orderBy: { employeeNumber: "desc" },
    select: { employeeNumber: true },
  });
  let nextNum = numberSuffix(last?.employeeNumber) + 1;

  try {
    await prisma.$transaction(async (tx) => {
      for (const r of data) {
        const rateToUsd = rateMap.get(r.currencyCode)!;
        const annualFactor = freqMap.get(r.frequencyId)!;
        const fields = buildSalaryFields({
          annualBaseLocal: r.annualBase,
          annualTotalLocal: r.annualTotal,
          rateToUsd,
          annualFactor,
          level: r.level as Level,
          countryIso2: r.countryIso2,
        });
        const employeeNumber = `ACME-${String(nextNum++).padStart(5, "0")}`;
        const effectiveDate = r.effectiveDate
          ? new Date(r.effectiveDate)
          : new Date(r.hireDate);

        const created = await tx.employee.create({
          data: {
            employeeNumber,
            firstName: r.firstName,
            lastName: r.lastName,
            email: r.email,
            avatarUrl: r.avatarUrl || null,
            gender: r.gender,
            title: r.title,
            level: r.level,
            status: r.status,
            isRemote: r.isRemote,
            hireDate: new Date(r.hireDate),
            dob: r.dob ? new Date(r.dob) : null,
            countryIso2: r.countryIso2,
            departmentId: r.departmentId,
            salaryRecords: {
              create: {
                basePay: fields.basePay,
                totalComp: fields.totalComp,
                currencyCode: r.currencyCode,
                frequencyId: r.frequencyId,
                basePayUsd: fields.basePayUsd,
                annualizedUsd: fields.annualizedUsd,
                annualizedTotalUsd: fields.annualizedTotalUsd,
                compaRatio: fields.compaRatio,
                effectiveDate,
                isCurrent: true,
              },
            },
          },
          select: { id: true },
        });

        await tx.auditLog.create({
          data: {
            employeeId: created.id,
            action: "CREATE",
            entity: "Employee",
            changedBy: user.email,
            after: {
              employeeNumber,
              name: `${r.firstName} ${r.lastName}`,
              email: r.email,
              title: r.title,
              level: r.level,
            },
          },
        });
      }
    });
  } catch (err) {
    // Unique-constraint race (email or employee number claimed concurrently).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("A unique field (email or employee number) is already taken. Retry.");
    }
    throw err;
  }

  revalidatePath("/employees");
  return { ok: true, error: null, createdCount: data.length };
}
