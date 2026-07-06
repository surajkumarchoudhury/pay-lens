import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  formatDateTime,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  formatTenure,
  todayLocal,
} from "@/lib/date";

// Tests run with TZ=UTC (see vitest.config.ts), so these assertions are stable.
describe("date formatters", () => {
  it("formatLongDate spells out the full date", () => {
    expect(formatLongDate("2026-01-05")).toBe("January 5, 2026");
  });

  it("formatShortDate abbreviates the month", () => {
    expect(formatShortDate("2026-01-05")).toBe("Jan 5, 2026");
  });

  it("formatMonthYear shows only month + year", () => {
    expect(formatMonthYear("2021-03-15")).toBe("Mar 2021");
  });

  it("formatDateTime appends the time", () => {
    expect(formatDateTime("2026-01-05T15:30:00Z")).toBe("Jan 5, 2026, 3:30 PM");
  });
});

describe("time-relative helpers", () => {
  const NOW = new Date("2026-07-06T00:00:00Z");
  const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  // A hair past `k` months ago, so floor() lands exactly on k.
  const monthsAgo = (k: number) =>
    new Date(NOW.getTime() - k * MS_PER_MONTH - 60_000).toISOString();

  it("todayLocal returns today's YYYY-MM-DD", () => {
    expect(todayLocal()).toBe("2026-07-06");
  });

  it("formatTenure renders months under a year", () => {
    expect(formatTenure(monthsAgo(6))).toBe("6 mo");
  });

  it("formatTenure renders whole years", () => {
    expect(formatTenure(monthsAgo(12))).toBe("1 yr");
    expect(formatTenure(monthsAgo(24))).toBe("2 yrs");
  });

  it("formatTenure renders years + months", () => {
    expect(formatTenure(monthsAgo(25))).toBe("2y 1m");
  });
});
