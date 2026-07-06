import "server-only";

import { prisma } from "@/lib/prisma";

/** The single-tenant org profile plus a couple of headline counts. */
export type OrganizationSettings = {
  id: string;
  name: string;
  baseCurrency: string;
  createdAt: string; // ISO
  employeeCount: number;
  departmentCount: number;
};

/**
 * Load the (single) organization row along with headline counts. Returns null
 * only if the org row is missing (unseeded database).
 */
export async function getOrganizationSettings(): Promise<OrganizationSettings | null> {
  const org = await prisma.organization.findFirst({
    select: { id: true, name: true, baseCurrency: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (!org) return null;

  const [employeeCount, departmentCount] = await Promise.all([
    prisma.employee.count(),
    prisma.department.count(),
  ]);

  return {
    id: org.id,
    name: org.name,
    baseCurrency: org.baseCurrency,
    createdAt: org.createdAt.toISOString(),
    employeeCount,
    departmentCount,
  };
}
