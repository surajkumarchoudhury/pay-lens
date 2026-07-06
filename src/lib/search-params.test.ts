import { describe, expect, it } from "vitest";

import { first, parsePage, parsePageSize } from "@/lib/search-params";

describe("first", () => {
  it("passes a plain string through", () => {
    expect(first("hello")).toBe("hello");
  });

  it("returns the first element of a repeated param", () => {
    expect(first(["a", "b"])).toBe("a");
  });

  it("returns undefined for missing / empty params", () => {
    expect(first(undefined)).toBeUndefined();
    expect(first([])).toBeUndefined();
  });
});

describe("parsePage", () => {
  it("parses a positive integer", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("falls back to 1 for invalid input", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
  });
});

describe("parsePageSize", () => {
  it("parses a positive integer", () => {
    expect(parsePageSize("25")).toBe(25);
  });

  it("returns undefined for invalid input so callers apply a default", () => {
    expect(parsePageSize(undefined)).toBeUndefined();
    expect(parsePageSize("0")).toBeUndefined();
    expect(parsePageSize("abc")).toBeUndefined();
  });
});
