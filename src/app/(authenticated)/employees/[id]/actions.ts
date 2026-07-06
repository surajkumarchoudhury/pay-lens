"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { buildSalaryFields } from "@/lib/compensation";
import { GENDER_OPTIONS } from "@/lib/employee-gender";
import { employeeProfileSchema } from "@/lib/employee-schema";
import { prisma } from "@/lib/prisma";
import { compaRatio, type Level } from "@/lib/salary-bands";

/** `useActionState` shape. `ok` closes the dialog; `error` renders inline. */
export type RecordChangeState = { ok: boolean; error: string | null };

const schema = z.object({
  employeeId: z.string().min(1),
  // Optimistic-concurrency guard against the record being retired.
  expectedVersion: z.coerce.number().int().nonnegative(),
  annualBase: z.coerce
    .number({ error: "Enter a valid amount" })
    .positive("Base pay must be greater than 0"),
  annualTotal: z.coerce
    .number({ error: "Enter a valid amount" })
    .positive("Total comp must be greater than 0"),
  // Optional; defaults to today. Local date string from an <input type="date">.
  effectiveDate: z.string().optional(),
});

/**
 * Record a compensation change for an employee. This never mutates the live
 * record: it retires the current one (isCurrent → false) and inserts a new
 * current record, so the salary history grows. Restricted to HR_MANAGER, and
 * the compa-affecting inputs (currency, frequency, level, country) are read
 * server-side — the client only supplies the two new amounts and a date.
 */
export async function recordCompensationChange(
  _prev: RecordChangeState,
  formData: FormData,
): Promise<RecordChangeState> {
  const user = await requireRole("HR_MANAGER");

  const parsed = schema.safeParse({
    employeeId: formData.get("employeeId"),
    expectedVersion: formData.get("expectedVersion"),
    annualBase: formData.get("annualBase"),
    annualTotal: formData.get("annualTotal"),
    effectiveDate: formData.get("effectiveDate"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { employeeId, expectedVersion, annualBase, annualTotal } = parsed.data;

  if (annualTotal < annualBase) {
    return { ok: false, error: "Total comp can't be less than base pay" };
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      level: true,
      countryIso2: true,
      salaryRecords: {
        where: { isCurrent: true },
        take: 1,
        select: {
          id: true,
          version: true,
          effectiveDate: true,
          currencyCode: true,
          frequencyId: true,
          basePay: true,
          totalComp: true,
          compaRatio: true,
          frequency: { select: { annualFactor: true } },
          currency: { select: { rateToUsd: true } },
        },
      },
    },
  });

  const currentRecord = employee?.salaryRecords[0];
  if (!employee || !currentRecord) {
    return { ok: false, error: "Employee or current compensation not found" };
  }

  // Effective date: default today; can't predate the record being replaced.
  const effectiveDate = parsed.data.effectiveDate
    ? new Date(parsed.data.effectiveDate)
    : new Date();
  if (Number.isNaN(effectiveDate.getTime())) {
    return { ok: false, error: "Enter a valid effective date" };
  }
  if (effectiveDate < currentRecord.effectiveDate) {
    return {
      ok: false,
      error: "Effective date can't be before the current record",
    };
  }

  const rateToUsd = Number(currentRecord.currency.rateToUsd);
  const annualFactor = currentRecord.frequency.annualFactor;

  const fields = buildSalaryFields({
    annualBaseLocal: annualBase,
    annualTotalLocal: annualTotal,
    rateToUsd,
    annualFactor,
    level: employee.level as Level,
    countryIso2: employee.countryIso2,
  });

  try {
    await prisma.$transaction(async (tx) => {
      // Optimistic guard: only retire the record if it's still the current one
      // at the version the form loaded. A concurrent change bumps the version.
      const retired = await tx.salaryRecord.updateMany({
        where: {
          id: currentRecord.id,
          isCurrent: true,
          version: expectedVersion,
        },
        data: { isCurrent: false, version: { increment: 1 } },
      });
      if (retired.count === 0) {
        throw new ConflictError();
      }

      const created = await tx.salaryRecord.create({
        data: {
          employeeId,
          currencyCode: currentRecord.currencyCode,
          frequencyId: currentRecord.frequencyId,
          basePay: fields.basePay,
          totalComp: fields.totalComp,
          basePayUsd: fields.basePayUsd,
          annualizedUsd: fields.annualizedUsd,
          annualizedTotalUsd: fields.annualizedTotalUsd,
          compaRatio: fields.compaRatio,
          effectiveDate,
          isCurrent: true,
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          employeeId,
          action: "UPDATE",
          entity: "SalaryRecord",
          changedBy: user.email,
          before: {
            recordId: currentRecord.id,
            basePay: currentRecord.basePay.toString(),
            totalComp: currentRecord.totalComp.toString(),
            compaRatio: currentRecord.compaRatio?.toString() ?? null,
          },
          after: {
            recordId: created.id,
            basePay: fields.basePay,
            totalComp: fields.totalComp,
            compaRatio: fields.compaRatio,
          },
        },
      });
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      return {
        ok: false,
        error: "This record changed since you opened the form. Reload and retry.",
      };
    }
    throw err;
  }

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
  return { ok: true, error: null };
}

/** Signals the optimistic-concurrency guard tripped, so we map it to a message. */
class ConflictError extends Error {}

// ── Employee profile editing ────────────────────────────────────────────────

export type UpdateEmployeeResult = {
  ok: boolean;
  error: string | null;
  /** Field-scoped messages so the client can highlight the exact inputs. */
  fieldErrors?: { field: string; message: string }[];
};

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function genderLabel(id: string): string {
  return GENDER_OPTIONS.find((o) => o.value === id)?.label ?? id;
}

/** Readable snapshot of the editable profile fields, for the audit diff. */
function profileSnapshot(v: {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  level: string;
  status: string;
  gender: string;
  isRemote: boolean;
  hireDate: Date;
  dob: Date | null;
  department: string;
  country: string;
  avatarUrl: string | null;
}): Record<string, string | null> {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    title: v.title,
    level: v.level,
    status: v.status,
    gender: genderLabel(v.gender),
    isRemote: v.isRemote ? "Remote" : "On-site",
    hireDate: v.hireDate.toISOString().slice(0, 10),
    dob: v.dob ? v.dob.toISOString().slice(0, 10) : null,
    department: v.department,
    country: v.country,
    avatarUrl: v.avatarUrl,
  };
}

/**
 * Update an employee's profile (everything except compensation, which has its
 * own flow). Restricted to HR_MANAGER. Because compa-ratio is derived from
 * level + country, changing either recomputes the *current* salary record's
 * compaRatio in the same transaction so denormalized analytics stay correct.
 * The change is recorded as an Employee UPDATE audit entry (readable diff).
 */
export async function updateEmployeeProfile(
  input: unknown,
): Promise<UpdateEmployeeResult> {
  const user = await requireRole("HR_MANAGER");

  const parsed = employeeProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: { field: string; message: string }[] = [];
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field) fieldErrors.push({ field, message: issue.message });
    }
    return { ok: false, error: "Please fix the highlighted fields", fieldErrors };
  }
  const p = parsed.data;

  const employee = await prisma.employee.findUnique({
    where: { id: p.employeeId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      gender: true,
      title: true,
      level: true,
      status: true,
      isRemote: true,
      hireDate: true,
      dob: true,
      avatarUrl: true,
      countryIso2: true,
      departmentId: true,
      department: { select: { name: true } },
      country: { select: { name: true } },
      salaryRecords: {
        where: { isCurrent: true },
        take: 1,
        select: { id: true, annualizedUsd: true },
      },
    },
  });
  if (!employee) return { ok: false, error: "Employee not found" };

  const [dept, country] = await Promise.all([
    prisma.department.findUnique({
      where: { id: p.departmentId },
      select: { name: true },
    }),
    prisma.country.findUnique({
      where: { iso2: p.countryIso2 },
      select: { name: true },
    }),
  ]);
  if (!dept) {
    return {
      ok: false,
      error: "Please fix the highlighted fields",
      fieldErrors: [{ field: "departmentId", message: "Unknown department" }],
    };
  }
  if (!country) {
    return {
      ok: false,
      error: "Please fix the highlighted fields",
      fieldErrors: [{ field: "countryIso2", message: "Unknown country" }],
    };
  }

  const clash = await prisma.employee.findFirst({
    where: { email: p.email, id: { not: p.employeeId } },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      error: "Please fix the highlighted fields",
      fieldErrors: [{ field: "email", message: "Email already in use" }],
    };
  }

  // Dates are already schema-validated; parse for the write + audit snapshot.
  const hireDate = new Date(p.hireDate);
  const dob = p.dob ? new Date(p.dob) : null;
  const avatarUrl = p.avatarUrl ? p.avatarUrl : null;

  const before = profileSnapshot({
    ...employee,
    department: employee.department.name,
    country: employee.country.name,
  });
  const after = profileSnapshot({
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    title: p.title,
    level: p.level,
    status: p.status,
    gender: p.gender,
    isRemote: p.isRemote,
    hireDate,
    dob,
    department: dept.name,
    country: country.name,
    avatarUrl,
  });

  // No-op guard: skip the write + audit entry when nothing changed.
  if (JSON.stringify(before) === JSON.stringify(after)) {
    return { ok: true, error: null };
  }

  const compaAffected =
    employee.level !== p.level || employee.countryIso2 !== p.countryIso2;
  const current = employee.salaryRecords[0];

  try {
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: p.employeeId },
        data: {
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          gender: p.gender,
          title: p.title,
          level: p.level,
          status: p.status,
          isRemote: p.isRemote,
          hireDate,
          dob,
          departmentId: p.departmentId,
          countryIso2: p.countryIso2,
          avatarUrl,
        },
      });

      // Level/country drive the compa band midpoint; recompute so the current
      // record's denormalized compaRatio (used by the list + analytics) stays true.
      if (compaAffected && current) {
        const ratio = compaRatio(
          Number(current.annualizedUsd),
          p.level as Level,
          p.countryIso2,
        );
        await tx.salaryRecord.update({
          where: { id: current.id },
          data: { compaRatio: ratio != null ? round4(ratio) : 1 },
        });
      }

      await tx.auditLog.create({
        data: {
          employeeId: p.employeeId,
          action: "UPDATE",
          entity: "Employee",
          changedBy: user.email,
          before,
          after,
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "Please fix the highlighted fields",
        fieldErrors: [{ field: "email", message: "Email already in use" }],
      };
    }
    throw err;
  }

  revalidatePath(`/employees/${p.employeeId}`);
  revalidatePath("/employees");
  return { ok: true, error: null };
}
