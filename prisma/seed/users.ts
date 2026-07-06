import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/lib/auth/password";
import { avatarUrl } from "./reference";

/**
 * Provisioned users (login-only, no public sign-up). Upserted by email.
 * The shared demo password is documented in the README for the assessment demo.
 */

const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "Password123!";

const USERS = [
  { email: "hr@acme.com", name: "Priya Sharma", role: "HR_MANAGER" as const },
  { email: "hr2@acme.com", name: "James Carter", role: "HR_MANAGER" as const },
  { email: "hr3@acme.com", name: "Mei Tan", role: "HR_MANAGER" as const },
  { email: "viewer@acme.com", name: "Auditor (Read-only)", role: "VIEWER" as const },
];

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  for (const u of USERS) {
    const avatar = avatarUrl(u.name);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, avatarUrl: avatar },
      create: { ...u, passwordHash, avatarUrl: avatar },
    });
  }
}
