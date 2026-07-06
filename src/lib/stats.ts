/**
 * Pure, dependency-free descriptive statistics used by the analytics layer.
 * `percentile` uses linear interpolation between adjacent ranks, matching
 * Postgres `percentile_cont`, so results stay consistent if a computation ever
 * moves into SQL. All functions expect finite numbers and never mutate input.
 */

/** Arithmetic mean, or null for an empty sample. */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Smallest value, or null for an empty sample. */
export function min(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => (b < a ? b : a)) : null;
}

/** Largest value, or null for an empty sample. */
export function max(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => (b > a ? b : a)) : null;
}

/**
 * Continuous quantile of an already-sorted (ascending), non-empty array.
 * `p` is clamped to [0, 1]. Linear interpolation between the two closest ranks
 * — the same method as Postgres `percentile_cont`.
 */
function quantileSorted(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const clamped = Math.min(1, Math.max(0, p));
  const rank = clamped * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

/**
 * Continuous percentile (`p` in [0, 1]) via linear interpolation between
 * adjacent ranks. Returns null for an empty sample. Does not mutate `values`.
 */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  return quantileSorted([...values].sort((a, b) => a - b), p);
}

/** Median (50th percentile), or null for an empty sample. */
export function median(values: number[]): number | null {
  return percentile(values, 0.5);
}

/** Six-number summary of a compensation sample. */
export type Summary = {
  count: number;
  min: number;
  median: number;
  p90: number;
  max: number;
  mean: number;
};

/**
 * Six-number summary (count, min, median, p90, max, mean) of a sample, or null
 * when empty. Sorts once and reuses the sorted array for every quantile.
 */
export function summarize(values: number[]): Summary | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    median: quantileSorted(sorted, 0.5),
    p90: quantileSorted(sorted, 0.9),
    max: sorted[sorted.length - 1],
    mean: sorted.reduce((sum, v) => sum + v, 0) / sorted.length,
  };
}
