/**
 * Employee-status metadata shared by the server (to build the Prisma `where`)
 * and the client (to render the status filter). Kept free of `server-only` and
 * Prisma imports so the client can use it without pulling in the data layer.
 * The ids mirror the Prisma `EmployeeStatus` enum values.
 */

export type EmployeeStatusId = "ACTIVE" | "ON_LEAVE" | "TERMINATED";

export const STATUS_OPTIONS: { value: EmployeeStatusId; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On leave" },
  { value: "TERMINATED", label: "Terminated" },
];

const STATUS_IDS = new Set<string>(STATUS_OPTIONS.map((o) => o.value));

export function statusLabel(id: EmployeeStatusId): string {
  return STATUS_OPTIONS.find((o) => o.value === id)?.label ?? id;
}

/** Parse a comma-separated `status` param into a de-duped list of valid ids. */
export function parseStatuses(raw: string | undefined): EmployeeStatusId[] {
  if (!raw) return [];
  const seen = new Set<EmployeeStatusId>();
  for (const part of raw.split(",")) {
    const id = part.trim().toUpperCase();
    if (STATUS_IDS.has(id)) seen.add(id as EmployeeStatusId);
  }
  return [...seen];
}
