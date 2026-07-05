import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import { searchSuggestions } from "@/lib/employees";

/**
 * Typeahead suggestions for the employee search box. Auth-gated the same way as
 * the pages: no valid session → 401 (never leak employee data to anonymous
 * callers). Reads `field` and `q` from the query string.
 */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ suggestions: [] }, { status: 401 });
  }

  const field = req.nextUrl.searchParams.get("field") ?? "";
  const q = req.nextUrl.searchParams.get("q") ?? "";

  const suggestions = await searchSuggestions(field, q);
  return NextResponse.json({ suggestions });
}
