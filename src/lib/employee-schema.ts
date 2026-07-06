import { z } from "zod";

/**
 * Shared validation for the create-employee form. Lives outside the
 * `"use server"` module so the client can run the exact same Zod rules for
 * instant, per-field errors while the server re-validates authoritatively.
 * Enum tuples mirror the Prisma enums (see employee-{gender,level,status}.ts).
 */

export const GENDER_VALUES = ["MALE", "FEMALE", "OTHER", "UNDISCLOSED"] as const;
export const LEVEL_VALUES = ["L1", "L2", "L3", "L4", "L5", "L6", "L7"] as const;
export const STATUS_VALUES = ["ACTIVE", "ON_LEAVE", "TERMINATED"] as const;

/** Field ids used for keying per-field errors on both sides. */
export type EmployeeFieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "gender"
  | "title"
  | "level"
  | "status"
  | "isRemote"
  | "countryIso2"
  | "departmentId"
  | "hireDate"
  | "dob"
  | "avatarUrl"
  | "currencyCode"
  | "frequencyId"
  | "annualBase"
  | "annualTotal"
  | "effectiveDate";

export const newEmployeeRowSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email is required")
      .email("Enter a valid email")
      .max(200),
    gender: z.enum(GENDER_VALUES, { message: "Select a gender" }),
    title: z.string().trim().min(1, "Title is required").max(120),
    level: z.enum(LEVEL_VALUES, { message: "Select a level" }),
    status: z.enum(STATUS_VALUES, { message: "Select a status" }),
    isRemote: z.boolean(),
    countryIso2: z.string().trim().min(1, "Country is required"),
    departmentId: z.string().trim().min(1, "Department is required"),
    hireDate: z.string().min(1, "Hire date is required"),
    dob: z.string().optional().or(z.literal("")),
    avatarUrl: z
      .string()
      .trim()
      .url("Enter a valid URL")
      .optional()
      .or(z.literal("")),
    currencyCode: z.string().trim().min(1, "Currency is required"),
    frequencyId: z.string().trim().min(1, "Pay frequency is required"),
    annualBase: z.coerce
      .number({ message: "Enter a valid amount" })
      .positive("Base pay must be greater than 0"),
    annualTotal: z.coerce
      .number({ message: "Enter a valid amount" })
      .positive("Total comp must be greater than 0"),
    effectiveDate: z.string().optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (
      Number.isFinite(v.annualBase) &&
      Number.isFinite(v.annualTotal) &&
      v.annualTotal < v.annualBase
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["annualTotal"],
        message: "Total comp can't be less than base pay",
      });
    }
    for (const key of ["hireDate", "dob", "effectiveDate"] as const) {
      const val = v[key];
      if (val && Number.isNaN(new Date(val).getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Enter a valid date",
        });
      }
    }
  });

export type NewEmployeeRow = z.infer<typeof newEmployeeRowSchema>;

/** One field-scoped validation message, addressed by row index + field. */
export type FieldError = { row: number; field: string; message: string };

/**
 * Editable employee-profile fields (everything except compensation, which has
 * its own flow). Shared by the detail-page edit form and its server action so
 * both run identical rules.
 */
export const employeeProfileSchema = z
  .object({
    employeeId: z.string().min(1),
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email is required")
      .email("Enter a valid email")
      .max(200),
    gender: z.enum(GENDER_VALUES, { message: "Select a gender" }),
    title: z.string().trim().min(1, "Title is required").max(120),
    level: z.enum(LEVEL_VALUES, { message: "Select a level" }),
    status: z.enum(STATUS_VALUES, { message: "Select a status" }),
    isRemote: z.boolean(),
    countryIso2: z.string().trim().min(1, "Country is required"),
    departmentId: z.string().trim().min(1, "Department is required"),
    hireDate: z.string().min(1, "Hire date is required"),
    dob: z.string().optional().or(z.literal("")),
    avatarUrl: z
      .string()
      .trim()
      .url("Enter a valid URL")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    for (const key of ["hireDate", "dob"] as const) {
      const val = v[key];
      if (val && Number.isNaN(new Date(val).getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "Enter a valid date",
        });
      }
    }
  });

/** Turn a Zod safeParse failure into field → first-message. */
function firstFieldErrors(
  issues: z.ZodIssue[],
): Record<string, string> | null {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validate a single row and return field → first-message. Used client-side to
 * highlight inputs before hitting the server.
 */
export function validateEmployeeRow(
  input: unknown,
): Record<string, string> | null {
  const result = newEmployeeRowSchema.safeParse(input);
  if (result.success) return null;
  return firstFieldErrors(result.error.issues);
}

/** Client-side per-field validation for the profile edit form. */
export function validateEmployeeProfile(
  input: unknown,
): Record<string, string> | null {
  const result = employeeProfileSchema.safeParse(input);
  if (result.success) return null;
  return firstFieldErrors(result.error.issues);
}
