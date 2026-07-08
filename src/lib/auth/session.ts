import "server-only";

import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "./constants";

/**
 * Server-side session management.
 *
 * The cookie holds an opaque, crypto-random token that is the primary key of a
 * `Session` row. Because sessions live in the database they can be revoked
 * server-side (logout, timeout, admin action) — something a stateless JWT
 * cannot do cleanly. Two independent expiries protect sensitive salary data:
 *   - absolute  (`expiresAt`)    — hard cap regardless of activity
 *   - idle      (`lastActiveAt`) — logs out unattended terminals
 */

export { SESSION_COOKIE };

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
const SLIDE_THRESHOLD_MS = 60 * 1000; // throttle lastActiveAt writes

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
};

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Create a session row and set the httpOnly cookie. Call from a Server Action. */
export async function createSession(userId: string): Promise<void> {
  const token = newToken();
  const userAgent = (await headers()).get("user-agent")?.slice(0, 512) ?? null;

  await prisma.session.create({
    data: {
      id: token,
      userId,
      userAgent,
      expiresAt: new Date(Date.now() + ABSOLUTE_TIMEOUT_MS),
    },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_TIMEOUT_MS / 1000,
  });
}

/** Delete the DB row only (no cookie mutation). Safe to call during render. */
async function invalidate(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: token } });
}

/**
 * Resolve the current user from the session cookie, enforcing both timeouts.
 * Returns null when there is no valid session. Safe to call in Server
 * Components: it never mutates cookies, only (throttled) the DB `lastActiveAt`.
 *
 * Wrapped in React `cache()` so the layout + page (+ any child components) share
 * a single lookup per request instead of re-querying the session — and the
 * throttled `lastActiveAt` write runs at most once per request.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });
  if (!session) return null;

  const now = Date.now();
  const expired =
    now >= session.expiresAt.getTime() ||
    now - session.lastActiveAt.getTime() >= IDLE_TIMEOUT_MS;

  if (expired) {
    await invalidate(token);
    return null;
  }

  // Slide the idle window, but throttle writes to avoid a query per request.
  if (now - session.lastActiveAt.getTime() > SLIDE_THRESHOLD_MS) {
    await prisma.session.update({
      where: { id: token },
      data: { lastActiveAt: new Date() },
    });
  }

  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
});

/** Destroy the current session (DB row + cookie). Call from a Server Action. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await invalidate(token);
  jar.delete(SESSION_COOKIE);
}

/** Require a session or redirect to /login. Use in protected server code. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require one of the given roles. Redirects unauthenticated users to /login and
 * throws for authenticated-but-unauthorized users (surfaced as a 403 boundary).
 * Gate mutating Server Actions with this — e.g. requireRole("HR_MANAGER").
 */
export async function requireRole(
  ...roles: UserRole[]
): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden: insufficient permissions");
  }
  return user;
}
