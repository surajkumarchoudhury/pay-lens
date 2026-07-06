import { describe, expect, it } from "vitest";

import {
  BAND_LOWER,
  BAND_UPPER,
  bandMidpointUsd,
  bandPlacement,
  compaRatio,
  DEFAULT_COUNTRY_MULTIPLIER,
  LEVEL_BASE_USD,
} from "@/lib/salary-bands";

describe("bandMidpointUsd", () => {
  it("scales the level base by the US multiplier (1.0)", () => {
    expect(bandMidpointUsd("L3", "US")).toBe(90_000);
  });

  it("applies a country's cost-of-labor multiplier", () => {
    expect(bandMidpointUsd("L1", "IN")).toBe(LEVEL_BASE_USD.L1 * 0.35);
  });

  it("falls back to the default multiplier for unknown countries", () => {
    expect(bandMidpointUsd("L1", "XX")).toBe(
      LEVEL_BASE_USD.L1 * DEFAULT_COUNTRY_MULTIPLIER,
    );
  });
});

describe("compaRatio", () => {
  it("is 1.0 when base pay equals the midpoint", () => {
    expect(compaRatio(90_000, "L3", "US")).toBe(1);
  });

  it("is proportional to pay above/below the midpoint", () => {
    expect(compaRatio(45_000, "L3", "US")).toBe(0.5);
    expect(compaRatio(108_000, "L3", "US")).toBeCloseTo(1.2, 5);
  });
});

describe("bandPlacement", () => {
  it("classifies below / within / above the ±10% window", () => {
    expect(bandPlacement(0.5)).toBe("below");
    expect(bandPlacement(1)).toBe("within");
    expect(bandPlacement(1.5)).toBe("above");
  });

  it("treats the boundaries as within band (inclusive)", () => {
    expect(bandPlacement(BAND_LOWER)).toBe("within");
    expect(bandPlacement(BAND_UPPER)).toBe("within");
    expect(bandPlacement(BAND_LOWER - 0.001)).toBe("below");
    expect(bandPlacement(BAND_UPPER + 0.001)).toBe("above");
  });
});
