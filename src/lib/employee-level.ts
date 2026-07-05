/**
 * Employee-level metadata shared by the server (to build the Prisma `where`)
 * and the client (to render the level filter). Kept free of `server-only` and
 * Prisma imports so the client can use it without pulling in the data layer.
 * The ids mirror the Prisma `EmployeeLevel` enum values.
 */

export type EmployeeLevelId =
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5"
  | "L6"
  | "L7";

export const LEVEL_OPTIONS: { value: EmployeeLevelId; label: string }[] = [
  { value: "L1", label: "L1 · Junior" },
  { value: "L2", label: "L2 · Associate" },
  { value: "L3", label: "L3 · Mid" },
  { value: "L4", label: "L4 · Senior" },
  { value: "L5", label: "L5 · Staff" },
  { value: "L6", label: "L6 · Principal" },
  { value: "L7", label: "L7 · Director" },
];

const LEVEL_IDS = new Set<string>(LEVEL_OPTIONS.map((o) => o.value));

export function levelLabel(id: EmployeeLevelId): string {
  return LEVEL_OPTIONS.find((o) => o.value === id)?.label ?? id;
}

/** Parse a comma-separated `level` param into a de-duped list of valid ids. */
export function parseLevels(raw: string | undefined): EmployeeLevelId[] {
  if (!raw) return [];
  const seen = new Set<EmployeeLevelId>();
  for (const part of raw.split(",")) {
    const id = part.trim().toUpperCase();
    if (LEVEL_IDS.has(id)) seen.add(id as EmployeeLevelId);
  }
  return [...seen];
}
