import { useEffect, useState } from "react";

type SuggestResponse<T> = { suggestions: T[] };

/**
 * Debounced typeahead against a JSON endpoint that returns
 * `{ suggestions: T[] }`. Handles the fiddly parts: waits `delay`ms after the
 * last change, aborts the in-flight request so responses never race, and keeps
 * the previous results visible while the next set loads.
 *
 * `loading` is *derived* (not stored): it's true whenever the current query
 * differs from the last one we resolved. That makes the spinner appear in the
 * same render the input changes — no flash of "no matches" during the debounce
 * window — without any synchronous setState inside the effect.
 *
 * The request URL is `${endpoint}?${...params}&${queryKey}=${term}`.
 */
export function useDebouncedSuggestions<T>({
  endpoint,
  term,
  params = {},
  queryKey = "q",
  delay = 250,
  minLength = 1,
}: {
  endpoint: string;
  term: string;
  params?: Record<string, string>;
  queryKey?: string;
  delay?: number;
  minLength?: number;
}): { suggestions: T[]; loading: boolean } {
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [resolvedKey, setResolvedKey] = useState<string | null>(null);

  const trimmed = term.trim();
  const paramsKey = new URLSearchParams(params).toString();
  // Non-null only when we should query; encodes everything the request depends
  // on, so we can tell whether the current results are up to date.
  const key = trimmed.length >= minLength ? `${paramsKey}::${trimmed}` : null;
  const loading = key !== null && key !== resolvedKey;

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const qp = new URLSearchParams(paramsKey);
        qp.set(queryKey, trimmed);
        const res = await fetch(`${endpoint}?${qp.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as SuggestResponse<T>;
        setSuggestions(data.suggestions);
      } catch {
        // aborted or network error — keep the prior suggestions
      } finally {
        // If a newer change aborted us, let that request settle the state.
        if (!controller.signal.aborted) setResolvedKey(key);
      }
    }, delay);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [key, endpoint, paramsKey, queryKey, trimmed, delay]);

  return { suggestions, loading };
}
