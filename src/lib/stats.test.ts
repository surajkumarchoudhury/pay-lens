import { describe, expect, it } from "vitest";

import { max, mean, median, min, percentile, summarize } from "@/lib/stats";

describe("mean", () => {
  it("returns null for an empty sample", () => {
    expect(mean([])).toBeNull();
  });

  it("averages the values", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([10])).toBe(10);
    expect(mean([-2, 2])).toBe(0);
  });
});

describe("min / max", () => {
  it("return null for an empty sample", () => {
    expect(min([])).toBeNull();
    expect(max([])).toBeNull();
  });

  it("find the extremes regardless of order", () => {
    expect(min([3, 1, 2])).toBe(1);
    expect(max([3, 1, 2])).toBe(3);
    expect(min([-5, -1])).toBe(-5);
  });
});

describe("percentile", () => {
  it("returns null for an empty sample", () => {
    expect(percentile([], 0.5)).toBeNull();
  });

  it("returns the sole value for a single-element sample", () => {
    expect(percentile([42], 0.9)).toBe(42);
  });

  it("interpolates linearly between adjacent ranks (percentile_cont)", () => {
    // rank = 0.5 * (4 - 1) = 1.5 → between sorted[1]=2 and sorted[2]=3
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2.5);
    // rank = 0.9 * (3 - 1) = 1.8 → 20 + (30 - 20) * 0.8 = 28
    expect(percentile([10, 20, 30], 0.9)).toBe(28);
  });

  it("returns the bounds at p=0 and p=1", () => {
    expect(percentile([5, 1, 9, 3], 0)).toBe(1);
    expect(percentile([5, 1, 9, 3], 1)).toBe(9);
  });

  it("clamps p outside [0, 1]", () => {
    expect(percentile([1, 2, 3], -1)).toBe(1);
    expect(percentile([1, 2, 3], 5)).toBe(3);
  });

  it("does not mutate the input array", () => {
    const input = [3, 1, 2];
    percentile(input, 0.5);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("median", () => {
  it("is the 50th percentile", () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("summarize", () => {
  it("returns null for an empty sample", () => {
    expect(summarize([])).toBeNull();
  });

  it("produces a six-number summary", () => {
    expect(summarize([1, 2, 3, 4])).toEqual({
      count: 4,
      min: 1,
      median: 2.5,
      // rank = 0.9 * 3 = 2.7 → 3 + (4 - 3) * 0.7 = 3.7
      p90: 3.7,
      max: 4,
      mean: 2.5,
    });
  });

  it("handles a single value", () => {
    expect(summarize([7])).toEqual({
      count: 1,
      min: 7,
      median: 7,
      p90: 7,
      max: 7,
      mean: 7,
    });
  });
});
