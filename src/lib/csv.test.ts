import { describe, expect, it } from "vitest";

import { escapeCsvField, rowsToCsv } from "@/lib/csv";

describe("escapeCsvField", () => {
  it("leaves simple values untouched", () => {
    expect(escapeCsvField("abc")).toBe("abc");
    expect(escapeCsvField(42)).toBe("42");
  });

  it("quotes values containing a comma", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
  });

  it("quotes and doubles inner quotes", () => {
    expect(escapeCsvField('a"b')).toBe('"a""b"');
  });

  it("quotes values containing newlines", () => {
    expect(escapeCsvField("a\nb")).toBe('"a\nb"');
    expect(escapeCsvField("a\r\nb")).toBe('"a\r\nb"');
  });
});

describe("rowsToCsv", () => {
  it("joins cells with commas and rows with CRLF", () => {
    expect(
      rowsToCsv([
        ["a", "b"],
        ["c", "d"],
      ]),
    ).toBe("a,b\r\nc,d");
  });

  it("escapes cells that need quoting", () => {
    expect(
      rowsToCsv([
        ["Name", "Note"],
        ["c,d", 'say "hi"'],
      ]),
    ).toBe('Name,Note\r\n"c,d","say ""hi"""');
  });

  it("serializes numeric cells", () => {
    expect(rowsToCsv([["Headcount"], [1200]])).toBe("Headcount\r\n1200");
  });
});
