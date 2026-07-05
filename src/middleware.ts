import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Coarse, fast auth gate at the edge. It only checks whether the session cookie
 * is *present* — it cannot validate it (no DB/argon2 at the edge). The
 * authoritative check (lookup + timeout enforcement) happens in the
 * (authenticated) layout via getSession(). This just avoids flashing protected
 * shells and keeps unauthenticated users on /login.
 */

const PUBLIC_PATHS = ["/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = req.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!hasCookie && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (hasCookie && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, static assets, and favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
