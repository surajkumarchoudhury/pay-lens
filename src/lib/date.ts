/**
 * Shared date formatters. All take an ISO string and render in `en-US` so dates
 * read consistently across the app (tables, cards, audit log). Centralized so
 * the various `new Date(iso).toLocaleDateString(...)` one-offs don't drift.
 */

/** "January 5, 2026" — full, spelled-out date for cards and detail views. */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** "Jan 5, 2026" — compact date for dense rows / tooltips. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Mar 2021" — month + year only, e.g. a hire date in a table cell. */
export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

/** "Jan 5, 2026, 3:30 PM" — date + time for the audit log. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Today as `YYYY-MM-DD` in the user's local time — for `<input type="date">`
 * defaults and `max` bounds. Offsets by the timezone before slicing so late-day
 * local times don't roll over to tomorrow's UTC date.
 */
export function todayLocal(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** Approximate months per calendar month, used for whole-ish tenure math. */
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

/** Whole-ish elapsed time since a date, e.g. "4y 2m", "7 mo", "1 yr". */
export function formatTenure(iso: string): string {
  const months = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / MS_PER_MONTH),
  );
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years <= 0) return `${months} mo`;
  if (rem === 0) return `${years} yr${years > 1 ? "s" : ""}`;
  return `${years}y ${rem}m`;
}
