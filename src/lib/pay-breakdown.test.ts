import { describe, expect, it } from "vitest";

import { buildPayBreakdowns, type PayRecord } from "@/lib/pay-breakdown";

const resolvers = {
  departmentName: (id: string) =>
    ({ dep_eng: "Engineering", dep_sales: "Sales" })[id] ?? id,
  countryName: (iso: string) =>
    ({ US: "United States", IN: "India" })[iso] ?? iso,
};

const records: PayRecord[] = [
  { totalUsd: 100_000, level: "L3", countryIso2: "US", departmentId: "dep_eng" },
  { totalUsd: 120_000, level: "L3", countryIso2: "US", departmentId: "dep_eng" },
  { totalUsd: 40_000, level: "L1", countryIso2: "IN", departmentId: "dep_eng" },
  {
    totalUsd: 200_000,
    level: "L5",
    countryIso2: "US",
    departmentId: "dep_sales",
  },
];

describe("buildPayBreakdowns", () => {
  it("returns empty breakdowns for no records", () => {
    expect(buildPayBreakdowns([], resolvers)).toEqual({
      byCountry: [],
      byDepartment: [],
      byLevel: [],
    });
  });

  it("summarizes each country group and orders by median desc", () => {
    const { byCountry } = buildPayBreakdowns(records, resolvers);

    expect(byCountry.map((r) => r.name)).toEqual(["United States", "India"]);
    expect(byCountry[0]).toEqual({
      key: "US",
      name: "United States",
      count: 3,
      min: 100_000,
      median: 120_000, // sorted [100k, 120k, 200k] → middle
      p90: 184_000, // 120k + (200k - 120k) * 0.8
      max: 200_000,
      mean: 140_000,
    });
    expect(byCountry[1]).toMatchObject({ key: "IN", count: 1, median: 40_000 });
  });

  it("summarizes each department group and orders by median desc", () => {
    const { byDepartment } = buildPayBreakdowns(records, resolvers);

    expect(byDepartment.map((r) => r.name)).toEqual(["Sales", "Engineering"]);
    expect(byDepartment.find((r) => r.key === "dep_eng")).toMatchObject({
      count: 3,
      median: 100_000, // sorted [40k, 100k, 120k] → middle
    });
  });

  it("keeps levels in ladder order (L1→L7), not by pay", () => {
    const { byLevel } = buildPayBreakdowns(records, resolvers);

    expect(byLevel.map((r) => r.key)).toEqual(["L1", "L3", "L5"]);
    expect(byLevel.map((r) => r.name)).toEqual([
      "L1 · Junior",
      "L3 · Mid",
      "L5 · Staff",
    ]);
    expect(byLevel.find((r) => r.key === "L3")?.median).toBe(110_000);
  });

  it("falls back to the raw key when a resolver has no label", () => {
    const { byCountry } = buildPayBreakdowns(
      [{ totalUsd: 50_000, level: "L2", countryIso2: "ZZ", departmentId: "d" }],
      resolvers,
    );
    expect(byCountry[0]).toMatchObject({ key: "ZZ", name: "ZZ" });
  });
});
