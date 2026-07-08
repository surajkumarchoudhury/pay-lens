import { describe, expect, it } from "vitest";

import { shapePayBreakdowns, type PayGroupStat } from "@/lib/pay-breakdown";

const resolvers = {
  departmentName: (id: string) =>
    ({ dep_eng: "Engineering", dep_sales: "Sales" })[id] ?? id,
  countryName: (iso: string) =>
    ({ US: "United States", IN: "India" })[iso] ?? iso,
};

/**
 * Mimics what the DB grouping-sets query returns (min/median/p90/max/mean are
 * computed by Postgres; this module only labels + orders them).
 */
const groups: PayGroupStat[] = [
  {
    dim: "country",
    key: "US",
    count: 3,
    min: 100_000,
    median: 120_000,
    p90: 184_000,
    max: 200_000,
    mean: 140_000,
  },
  {
    dim: "country",
    key: "IN",
    count: 1,
    min: 40_000,
    median: 40_000,
    p90: 40_000,
    max: 40_000,
    mean: 40_000,
  },
  {
    dim: "department",
    key: "dep_eng",
    count: 3,
    min: 40_000,
    median: 100_000,
    p90: 116_000,
    max: 120_000,
    mean: 86_666.67,
  },
  {
    dim: "department",
    key: "dep_sales",
    count: 1,
    min: 200_000,
    median: 200_000,
    p90: 200_000,
    max: 200_000,
    mean: 200_000,
  },
  {
    dim: "level",
    key: "L5",
    count: 1,
    min: 200_000,
    median: 200_000,
    p90: 200_000,
    max: 200_000,
    mean: 200_000,
  },
  {
    dim: "level",
    key: "L1",
    count: 1,
    min: 40_000,
    median: 40_000,
    p90: 40_000,
    max: 40_000,
    mean: 40_000,
  },
  {
    dim: "level",
    key: "L3",
    count: 2,
    min: 100_000,
    median: 110_000,
    p90: 116_000,
    max: 120_000,
    mean: 110_000,
  },
];

describe("shapePayBreakdowns", () => {
  it("returns empty breakdowns for no groups", () => {
    expect(shapePayBreakdowns([], resolvers)).toEqual({
      byCountry: [],
      byDepartment: [],
      byLevel: [],
    });
  });

  it("labels country groups and orders them by median desc", () => {
    const { byCountry } = shapePayBreakdowns(groups, resolvers);

    expect(byCountry.map((r) => r.name)).toEqual(["United States", "India"]);
    expect(byCountry[0]).toEqual({
      key: "US",
      name: "United States",
      count: 3,
      min: 100_000,
      median: 120_000,
      p90: 184_000,
      max: 200_000,
      mean: 140_000,
    });
  });

  it("labels department groups and orders them by median desc", () => {
    const { byDepartment } = shapePayBreakdowns(groups, resolvers);

    expect(byDepartment.map((r) => r.name)).toEqual(["Sales", "Engineering"]);
    expect(byDepartment.find((r) => r.key === "dep_eng")).toMatchObject({
      count: 3,
      median: 100_000,
    });
  });

  it("keeps levels in ladder order (L1→L7), not by pay", () => {
    const { byLevel } = shapePayBreakdowns(groups, resolvers);

    expect(byLevel.map((r) => r.key)).toEqual(["L1", "L3", "L5"]);
    expect(byLevel.map((r) => r.name)).toEqual([
      "L1 · Junior",
      "L3 · Mid",
      "L5 · Staff",
    ]);
    expect(byLevel.find((r) => r.key === "L3")?.median).toBe(110_000);
  });

  it("falls back to the raw key when a resolver has no label", () => {
    const { byCountry } = shapePayBreakdowns(
      [
        {
          dim: "country",
          key: "ZZ",
          count: 1,
          min: 50_000,
          median: 50_000,
          p90: 50_000,
          max: 50_000,
          mean: 50_000,
        },
      ],
      resolvers,
    );
    expect(byCountry[0]).toMatchObject({ key: "ZZ", name: "ZZ" });
  });
});
