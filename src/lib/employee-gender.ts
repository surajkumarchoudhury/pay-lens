/**
 * Gender metadata shared by the server and client. Ids mirror the Prisma
 * `Gender` enum values. Kept free of `server-only`/Prisma so client forms can
 * import it directly.
 */

export type GenderId = "MALE" | "FEMALE" | "OTHER" | "UNDISCLOSED";

export const GENDER_OPTIONS: { value: GenderId; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "UNDISCLOSED", label: "Undisclosed" },
];

export const GENDER_IDS = new Set<string>(GENDER_OPTIONS.map((o) => o.value));

export function genderLabel(id: GenderId): string {
  return GENDER_OPTIONS.find((o) => o.value === id)?.label ?? id;
}

/** Parse a comma-separated `gender` param into a de-duped list of valid ids. */
export function parseGenders(raw: string | undefined): GenderId[] {
  if (!raw) return [];
  const seen = new Set<GenderId>();
  for (const part of raw.split(",")) {
    const id = part.trim().toUpperCase();
    if (GENDER_IDS.has(id)) seen.add(id as GenderId);
  }
  return [...seen];
}
