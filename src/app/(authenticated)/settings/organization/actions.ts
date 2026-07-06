"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/** `useTransition` result shape. `ok` closes the edit form; `error` renders inline. */
export type UpdateOrgState = { ok: boolean; error: string | null };

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name is too long"),
  baseCurrency: z.string().trim().min(1, "Select a base currency"),
});

/**
 * Update the organization profile (name + reporting/base currency). Restricted
 * to HR_MANAGER. The base currency must reference an existing Currency row —
 * validated server-side so a tampered form can't set an unknown code. The
 * change is recorded in the audit trail (entity "Organization", no employee).
 */
export async function updateOrganization(
  _prev: UpdateOrgState,
  formData: FormData,
): Promise<UpdateOrgState> {
  const user = await requireRole("HR_MANAGER");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    baseCurrency: formData.get("baseCurrency"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { name, baseCurrency } = parsed.data;

  const org = await prisma.organization.findFirst({
    select: { id: true, name: true, baseCurrency: true },
    orderBy: { createdAt: "asc" },
  });
  if (!org) {
    return { ok: false, error: "Organization not found" };
  }

  const currency = await prisma.currency.findUnique({
    where: { code: baseCurrency },
    select: { code: true },
  });
  if (!currency) {
    return { ok: false, error: "Unknown base currency" };
  }

  // No-op guard: nothing changed, so skip the write + audit entry.
  if (org.name === name && org.baseCurrency === baseCurrency) {
    return { ok: true, error: null };
  }

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: org.id },
      data: { name, baseCurrency },
    });
    await tx.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "Organization",
        changedBy: user.email,
        before: { name: org.name, baseCurrency: org.baseCurrency },
        after: { name, baseCurrency },
      },
    });
  });

  revalidatePath("/settings/organization");
  // Base currency drives reporting figures elsewhere.
  revalidatePath("/");
  return { ok: true, error: null };
}
