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
