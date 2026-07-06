/**
 * Column layout (order + which columns are shown) is a per-user *display*
 * preference for the employees table — not part of the shareable query. It's
 * persisted in a cookie (not localStorage) so the *server* can read it and
 * render the saved layout on first paint, avoiding a hydration mismatch/reflow.
 *
 * This module is plain (no "use client") so it can be imported by both the
 * server page (to read + parse the cookie) and the client provider. It's the
 * single source of truth for the column list, defaults, and (de)serialization.
 */

export type ColumnMeta = {
  id: string;
  label: string;
  /** Locked columns are always shown, pinned first, and can't be dragged. */
  locked?: boolean;
};

export const EMPLOYEE_COLUMN_META: ColumnMeta[] = [
  { id: "name", label: "Employee", locked: true },
  { id: "title", label: "Title" },
  { id: "level", label: "Level" },
  { id: "department", label: "Department" },
  { id: "country", label: "Country" },
  { id: "hireDate", label: "Hire date" },
  { id: "effectiveDate", label: "Effective date" },
  { id: "salary", label: "Annual base" },
  { id: "totalComp", label: "Total comp" },
  { id: "compa", label: "Compa-ratio" },
  { id: "isRemote", label: "Work mode" },
  { id: "status", label: "Status" },
];

export const COLUMN_COOKIE_NAME = "paylens.employees.columns.v1";

export type LayoutState = { order: string[]; hidden: string[] };

export const ALL_IDS = EMPLOYEE_COLUMN_META.map((m) => m.id);

export const LOCKED_IDS = new Set(
  EMPLOYEE_COLUMN_META.filter((m) => m.locked).map((m) => m.id),
);

// Columns hidden out of the box to keep the default view focused; users can
// switch them on via the "Columns" popover (choice persists in the cookie).
export const DEFAULT_HIDDEN = ["hireDate", "effectiveDate", "isRemote", "compa"];

export const DEFAULT_STATE: LayoutState = {
  order: ALL_IDS,
  hidden: DEFAULT_HIDDEN,
};

export function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** Keep locked columns first, then the given order, dropping/adding as needed. */
export function normalizeOrder(order: string[]): string[] {
  const known = order.filter((id) => ALL_IDS.includes(id));
  const merged = [...known, ...ALL_IDS.filter((id) => !known.includes(id))];
  const locked = merged.filter((id) => LOCKED_IDS.has(id));
  const rest = merged.filter((id) => !LOCKED_IDS.has(id));
  return [...locked, ...rest];
}

export function sanitizeHidden(hidden: string[]): string[] {
  return hidden.filter((id) => ALL_IDS.includes(id) && !LOCKED_IDS.has(id));
}

export function isDefaultLayout(state: LayoutState): boolean {
  return (
    sameSet(state.hidden, DEFAULT_HIDDEN) &&
    state.order.length === ALL_IDS.length &&
    state.order.every((id, i) => id === ALL_IDS[i])
  );
}

/**
 * Parse a cookie value (URI-encoded JSON) into a validated layout, falling back
 * to defaults for anything missing/corrupt. Safe to call on the server.
 */
export function parseColumnLayout(raw: string | undefined | null): LayoutState {
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<LayoutState>;
    return {
      order: normalizeOrder(parsed.order ?? ALL_IDS),
      hidden: sanitizeHidden(parsed.hidden ?? DEFAULT_HIDDEN),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/** Serialize a layout for storage in the cookie value (URI-encoded JSON). */
export function serializeColumnLayout(state: LayoutState): string {
  return encodeURIComponent(JSON.stringify(state));
}
