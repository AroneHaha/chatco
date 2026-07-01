// src/lib/server/session.ts
//
// Server-side session parsing for the prototype-phase auth.
//
// The login route (src/app/api/auth/login/route.ts) sets an httpOnly cookie:
//   chatco_session = "chatco:{userId}:{role}:{timestamp}"
//
// (No HMAC signature in the prototype phase — the real Laravel backend will
// issue a Sanctum token. Until then, the cookie format is the contract.)
//
// All SOS API routes use `getSessionUser()` to identify the caller and enforce
// role-based access (COMMUTER for triggering, ADMIN for monitoring/resolving).

import { cookies } from "next/headers";
import type { UserRole } from "@/types";

export interface SessionUser {
  id: string;
  role: UserRole;
}

const VALID_ROLES: UserRole[] = ["COMMUTER", "ADMIN", "CONDUCTOR"];

/**
 * Read the chatco_session cookie from the incoming request and return the
 * authenticated user, or null if there is no valid session.
 *
 * Must be called inside a Route Handler / Server Action (uses next/headers).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("chatco_session")?.value;
  if (!raw) return null;

  const token = decodeURIComponent(raw);
  const parts = token.split(":");
  // Expected: "chatco:{id}:{role}:{timestamp}"
  if (parts.length < 4 || parts[0] !== "chatco") return null;

  const id = parts[1];
  const role = parts[2] as UserRole;
  if (!id || !VALID_ROLES.includes(role)) return null;

  return { id, role };
}

/**
 * Require an authenticated session. Returns the user, or a 401 Response
 * (caller should return it directly).
 */
export async function requireSession(): Promise<
  { ok: true; user: SessionUser } | { ok: false; response: Response }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json(
        { message: "Authentication required." },
        { status: 401 }
      ),
    };
  }
  return { ok: true, user };
}

/**
 * Require a specific role. Returns the user, or a 403 Response.
 */
export async function requireRole(
  ...roles: UserRole[]
): Promise<
  { ok: true; user: SessionUser } | { ok: false; response: Response }
> {
  const session = await requireSession();
  if (!session.ok) return session;
  if (!roles.includes(session.user.role)) {
    return {
      ok: false,
      response: Response.json(
        { message: "You do not have permission to perform this action." },
        { status: 403 }
      ),
    };
  }
  return { ok: true, user: session.user };
}
