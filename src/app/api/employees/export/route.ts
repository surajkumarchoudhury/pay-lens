import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { parseLevels } from "@/lib/employee-level";
import { buildEmployeesCsv, EXPORT_COLUMNS } from "@/lib/employee-export";
import { resolveSearchField } from "@/lib/employee-search";
import { parseStatuses } from "@/lib/employee-status";
import { exportEmployees, getCurrencies } from "@/lib/employees";

function amount(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

// Default export columns when the client sends none: the table's default view.
// Derived from EXPORT_COLUMNS (a plain server-safe module) — insertion order
// mirrors the table's column order — rather than the "use client" settings
// module, which can't be imported into a route handler.
const DEFAULT_HIDDEN = new Set([
  "hireDate",
  "effectiveDate",
  "isRemote",
  "compa",
]);
const DEFAULT_COLUMNS = Object.keys(EXPORT_COLUMNS).filter(
  (id) => !DEFAULT_HIDDEN.has(id),
);

/** Only allow known column ids, preserving the requested order. */
function parseColumns(raw: string | null): string[] {
  const ids = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) => EXPORT_COLUMNS[id]);
  return ids.length ? ids : DEFAULT_COLUMNS;
}

/**
 * CSV export of the employee directory. Auth-gated like the pages. Reuses the
 * table's exact filters/sort (from the query string) via exportEmployees, and
 * the client's chosen column order/visibility (`cols`) via the shared export
 * mapping — so the file matches what the user sees. Unpaged, capped server-side.
 */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const cur = sp.get("cur")?.toUpperCase() || undefined;

  const rows = await exportEmployees({
    sortBy: sp.get("sort") ?? undefined,
    sortDir: sp.get("dir") === "desc" ? "desc" : "asc",
    search: sp.get("q")?.trim() ?? "",
    searchField: resolveSearchField(sp.get("field") ?? undefined),
    salaryMin: amount(sp.get("salMin")),
    salaryMax: amount(sp.get("salMax")),
    totalCompMin: amount(sp.get("compMin")),
    totalCompMax: amount(sp.get("compMax")),
    compaMin: amount(sp.get("crMin")),
    compaMax: amount(sp.get("crMax")),
    salaryCurrency: cur,
    statuses: parseStatuses(sp.get("status") ?? undefined),
    levels: parseLevels(sp.get("level") ?? undefined),
    hireDateFrom: sp.get("hireFrom") ?? undefined,
    hireDateTo: sp.get("hireTo") ?? undefined,
    effectiveDateFrom: sp.get("effFrom") ?? undefined,
    effectiveDateTo: sp.get("effTo") ?? undefined,
  });

  // Resolve the selected display currency (for money columns), if any.
  const displayCurrency = cur
    ? (await getCurrencies()).find((c) => c.code === cur) ?? null
    : null;

  const columns = parseColumns(sp.get("cols"));
  // Prepend a BOM so Excel reads UTF-8 symbols (₹, €, …) correctly.
  const csv = "\uFEFF" + buildEmployeesCsv(rows, columns, { displayCurrency });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="employees-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
