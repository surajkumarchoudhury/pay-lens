/**
 * Search-field definitions shared by the server (to build the Prisma `where`)
 * and the client (to render the advanced-search dropdown). This module is
 * intentionally free of `server-only` and Prisma imports so the client bundle
 * can import the labels without pulling in the data layer.
 */

export type SearchFieldId =
  | "name"
  | "email"
  | "title"
  | "country"
  | "employeeNumber"
  | "department";

export type SearchField = {
  id: SearchFieldId;
  label: string;
  placeholder: string;
};

/**
 * One typeahead suggestion. `value` is applied on select; how the rest renders
 * depends on the field:
 *  - person fields (name, email) carry `subLabel` (email) + `avatarUrl`, shown
 *    as a stacked card (avatar · label over subLabel), mirroring the table row;
 *  - simple fields show `label` with an optional right-aligned `hint`.
 */
export type SearchSuggestion = {
  value: string;
  label: string;
  hint?: string;
  subLabel?: string;
  avatarUrl?: string | null;
};

export const SEARCH_FIELDS: SearchField[] = [
  { id: "name", label: "Employee name", placeholder: "Search by employee name" },
  { id: "email", label: "Email", placeholder: "Search by email" },
  { id: "title", label: "Job title", placeholder: "Search by job title" },
  { id: "country", label: "Country", placeholder: "Search by country" },
  {
    id: "employeeNumber",
    label: "Employee ID",
    placeholder: "Search by employee ID (e.g. ACME-01234)",
  },
  { id: "department", label: "Department", placeholder: "Search by department" },
];

export const DEFAULT_SEARCH_FIELD: SearchFieldId = "name";

const FIELD_IDS = new Set<string>(SEARCH_FIELDS.map((f) => f.id));

/** Narrow an arbitrary param to a known search-field id. */
export function isSearchField(value: string | undefined): value is SearchFieldId {
  return value !== undefined && FIELD_IDS.has(value);
}

/** Resolve a raw param to a valid field, falling back to the default. */
export function resolveSearchField(value: string | undefined): SearchFieldId {
  return isSearchField(value) ? value : DEFAULT_SEARCH_FIELD;
}

export function searchFieldLabel(id: SearchFieldId): string {
  return SEARCH_FIELDS.find((f) => f.id === id)?.label ?? id;
}

export function searchFieldPlaceholder(id: SearchFieldId): string {
  return SEARCH_FIELDS.find((f) => f.id === id)?.placeholder ?? "Search";
}
