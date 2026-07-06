/**
 * Work mode is a single, mutually-exclusive facet (an employee is either remote
 * or on-site), so it's modeled as a single-select filter keyed off the `mode`
 * URL param. Backed by the `Employee.isRemote` boolean.
 */
export const WORK_MODE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
] as const;

export type WorkModeId = (typeof WORK_MODE_OPTIONS)[number]["value"];

/** Parse the `mode` param into a known id, or null when absent/invalid. */
export function parseWorkMode(
  raw: string | undefined,
): WorkModeId | undefined {
  return raw === "remote" || raw === "onsite" ? raw : undefined;
}
