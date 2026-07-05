"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { buildSalaryFields } from "@/lib/compensation";
import { prisma } from "@/lib/prisma";
import type { Level } from "@/lib/salary-bands";

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
