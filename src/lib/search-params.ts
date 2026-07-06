/**
 * Small helpers for reading Next.js `searchParams` in server pages. A param can
 * arrive as a string, a string[] (repeated key), or undefined; these normalize
 * that and parse the shared pagination params consistently across pages.
 */

/** First value of a (possibly repeated) search param, or undefined. */
export function first(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 1-based page number; falls back to 1 for missing/invalid input. */
export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Page size, or undefined (let the caller apply its default) when invalid. */
export function parsePageSize(value: string | undefined): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}
