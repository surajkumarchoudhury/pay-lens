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
