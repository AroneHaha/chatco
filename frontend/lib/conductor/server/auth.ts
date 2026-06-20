import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/conductor/server/response";

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

/**
 * Resolve the conductor session from the Sanctum bearer token stored in the
 * `chatco_session` cookie.
 *
 * WHY THIS EXISTS
 * ---------------
 * The conductor mock-stub routes (profile, units, drivers, shifts, …) all
 * gate on `getConductorSession()`. The original implementation parsed the
 * cookie as a prototype-only mock token of the form
 * `chatco:{id}:{role}:{timestamp}`. After the Laravel Sanctum auth
 * integration, `/api/auth/login` now stores a real Sanctum bearer token
 * (e.g. `1|abcdef…`) in the same cookie, so the old parser always returned
 * `null` and every conductor endpoint answered **401 Unauthorized** — even
 * for a legitimately logged-in conductor.
 *
 * HOW IT WORKS
 * ------------
 * 1. Read the Sanctum token from the `chatco_session` cookie.
 * 2. Validate it against the Laravel `GET /api/user` endpoint (guarded by
 *    `auth:sanctum`). This is the same call `/api/auth/me` makes.
 * 3. If the authenticated user's role is `CONDUCTOR`, return a
 *    {@link ConductorSession} with the real id / email / name from the
 *    backend. Otherwise return `null` so the route handler can emit 401.
 *
 * The function is intentionally async because token validation requires a
 * network round-trip to the backend. All conductor route handlers already
 * run inside `async function GET/POST(...)` handlers, so callers simply
 * `await` the result.
 */
export async function getConductorSession(
  request: NextRequest
): Promise<ConductorSession | null> {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/v1/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;

    const body = await res.json();
    // Laravel ApiResponse envelope: { success, data: { user, profile }, … }
    const user = body?.data?.user ?? body?.user;

    if (!user || user.role !== "CONDUCTOR") return null;

    return {
      userId: String(user.id),
      role: user.role,
      email: user.email,
      name: user.name,
    };
  } catch {
    // Backend unreachable / network error → treat as unauthenticated.
    return null;
  }
}

export function unauthorizedResponse() {
  return jsonError("Unauthorized. Conductor session required.", 401);
}
