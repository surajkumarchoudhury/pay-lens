/**
 * Result-affecting query params for the employees list. Both the server (from
 * `searchParams`) and the client (from `useSearchParams`) compute an identical
 * token from these, so the table can tell when the rows on screen are stale
 * relative to the current URL — i.e. a navigation is in flight — and show a
 * body-only loading state while keeping the (constant) header in place.
 */
export const RESULT_PARAM_KEYS = [
  "page",
  "pageSize",
  "sort",
  "dir",
  "q",
  "field",
  "salMin",
  "salMax",
  "compMin",
  "compMax",
  "crMin",
  "crMax",
  "cur",
  "level",
  "status",
  "gender",
  "mode",
  "hireFrom",
  "hireTo",
  "effFrom",
  "effTo",
] as const;

export function resultsToken(get: (key: string) => string | null): string {
  return RESULT_PARAM_KEYS.map((k) => `${k}=${get(k) ?? ""}`).join("&");
}
