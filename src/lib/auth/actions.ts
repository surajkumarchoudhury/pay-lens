"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password";
import { createSession, destroySession } from "./session";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = { error: string | null };

/**
 * Credentials login (React `useActionState` shape). On success it sets the
 * session cookie and redirects; on failure it returns a single generic message
 * (we don't distinguish unknown-email from wrong-password).
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    return { error: "Invalid email or password" };
  }

  await createSession(user.id);
  redirect("/");
}

/** Log out: revoke the session server-side, clear the cookie, return to /login. */
export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
