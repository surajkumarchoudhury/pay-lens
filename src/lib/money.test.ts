import { describe, expect, it } from "vitest";

import {
  annualize,
  formatCompactMoney,
  formatMoney,
  fromUsd,
  round2,
  toUsd,
} from "@/lib/money";

describe("round2", () => {
  it("rounds to two decimal places", () => {
    expect(round2(1.234)).toBe(1.23);
    expect(round2(1.236)).toBe(1.24);
    expect(round2(5)).toBe(5);
  });
});

describe("toUsd / fromUsd", () => {
  it("converts to USD via the rate", () => {
    expect(toUsd(1000, 0.012)).toBe(12);
  });

  it("converts back out of USD", () => {
    expect(fromUsd(12, 0.012)).toBe(1000);
  });

  it("round-trips (within cents)", () => {
    const rate = 0.011;
    expect(fromUsd(toUsd(50000, rate), rate)).toBeCloseTo(50000, 0);
  });
});

describe("annualize", () => {
  it("multiplies by the annual factor", () => {
    expect(annualize(5000, 12)).toBe(60000);
    expect(annualize(50, 2080)).toBe(104000);
  });
});

describe("formatMoney", () => {
  it("formats whole currency by default", () => {
    expect(formatMoney(1234567, "USD")).toBe("$1,234,567");
  });

  it("uses the currency's own symbol", () => {
    expect(formatMoney(1000, "INR")).toBe("₹1,000");
  });

  it("honors an explicit fraction-digit count", () => {
    expect(formatMoney(1234.56, "USD", 2)).toBe("$1,234.56");
  });
});

describe("formatCompactMoney", () => {
  it("scales into K / M / B / T tiers", () => {
    expect(formatCompactMoney(59_000)).toBe("$59K");
    expect(formatCompactMoney(820_400)).toBe("$820.4K");
    expect(formatCompactMoney(2_000_000)).toBe("$2M");
    expect(formatCompactMoney(1_500_000_000)).toBe("$1.5B");
  });

  it("drops the decimal for whole tier values (deterministic across runtimes)", () => {
    // Regression: Intl compact rendered "$59.0K" on Node vs "$59K" in browsers,
    // causing hydration mismatches. Ours must always drop the trailing .0.
    expect(formatCompactMoney(59_000)).not.toContain(".0");
  });

  it("formats sub-thousand amounts without a suffix", () => {
    expect(formatCompactMoney(999)).toBe("$999");
    expect(formatCompactMoney(0)).toBe("$0");
  });

  it("handles negatives", () => {
    expect(formatCompactMoney(-59_000)).toBe("-$59K");
  });

  it("respects a non-USD currency", () => {
    expect(formatCompactMoney(2_000_000, "INR")).toBe("₹2M");
  });
});
