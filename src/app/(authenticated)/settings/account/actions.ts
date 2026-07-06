"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/** `useTransition` result shape. `ok` closes the edit form; `error` renders inline. */
export type UpdateAccountState = { ok: boolean; error: string | null };

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name is too long"),
  // Optional avatar URL. Empty string clears it; when present it must be a URL.
  avatarUrl: z
    .string()
    .trim()
    .max(2048, "URL is too long")
    .url("Enter a valid URL")
    .optional()
    .or(z.literal("")),
});

/**
 * Update the signed-in user's own display name. Any authenticated user may edit
 * their own profile; the action always targets `user.id` from the session, so
 * it can never touch another account. Email and role are intentionally not
 * editable here (identity / access control live elsewhere). Recorded in the
 * audit trail (entity "User").
 */
export async function updateAccountProfile(
  _prev: UpdateAccountState,
  formData: FormData,
): Promise<UpdateAccountState> {
  const user = await requireSession();

  const parsed = schema.safeParse({
    name: formData.get("name"),
    avatarUrl: formData.get("avatarUrl"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { name } = parsed.data;
  // Normalize empty string to null so "cleared" persists as no avatar.
  const avatarUrl = parsed.data.avatarUrl ? parsed.data.avatarUrl : null;

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, avatarUrl: true },
  });
  if (!current) return { ok: false, error: "Account not found" };

  // No-op guard: nothing changed, so skip the write + audit entry.
  if (current.name === name && current.avatarUrl === avatarUrl) {
    return { ok: true, error: null };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name, avatarUrl } });
    await tx.auditLog.create({
      data: {
        action: "UPDATE",
        entity: "User",
        changedBy: user.email,
        before: { name: current.name, avatarUrl: current.avatarUrl },
        after: { name, avatarUrl },
      },
    });
  });

  revalidatePath("/settings/account");
  return { ok: true, error: null };
}
