import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/conductor/server/response";
import { getRoleDashboard } from "@/types/user";

export interface ConductorSession {
  userId: string;
  role: string;
  email?: string;
  name?: string;
}

/**
 * Laravel backend base URL. The same env var is used by the auth route
 * handlers (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`).
 */
const API_URL = process.env.API_URL || "http://localhost:8000";

/** Verify pages against Sanctum, never the editable role cookie.
 * Service failures throw so callers can deny access without ending a session.
 */
export async function getAuthenticatedSession(
  request: NextRequest
): Promise<ConductorSession | null> {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) return null;

  const res = await fetch(`${API_URL}/api/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error("Unable to verify session.");

  const body = await res.json();
  const user = body?.data?.user ?? body?.user;
  if (!user?.id || !getRoleDashboard(user.role)) return null;

  return {
    userId: String(user.id),
    role: user.role,
    email: user.email,
    name: user.name,
  };
}

/**
 * Resolve the conductor session from the Sanctum bearer token stored in the
 * `chatco_session` cookie.
 *
 * Validates the token against Laravel `GET /api/v1/user` (guarded by
 * `auth:sanctum`). If the authenticated user's role is `CONDUCTOR`, returns a
 * {@link ConductorSession}; otherwise (rejected token or unreachable backend)
 * returns null.
 */
export async function getConductorSession(
  request: NextRequest
): Promise<ConductorSession | null> {
  try {
    const session = await getAuthenticatedSession(request);
    return session?.role === "CONDUCTOR" ? session : null;
  } catch {
    // Backend unreachable / network error.
    return null;
  }
}

export function unauthorizedResponse() {
  return jsonError("Unauthorized. Conductor session required.", 401);
}
