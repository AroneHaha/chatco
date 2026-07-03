import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/conductor/server/response";
import { resolveSessionInMemory } from "@/lib/shared/server/inmemory-backend";

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
 * PRIMARY PATH (production): validate the token against Laravel
 * `GET /api/v1/user` (guarded by `auth:sanctum`). If the authenticated user's
 * role is `CONDUCTOR`, return a {@link ConductorSession}.
 *
 * FALLBACK PATH (dev/demo): when the Laravel backend is unreachable (the PHP
 * runtime is unavailable in the sandbox preview), resolve the token against
 * the in-memory session store. This keeps the conductor flow demoable
 * end-to-end without a live Laravel instance. Production deployments with a
 * live Laravel instance never reach the fallback.
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

    if (!res.ok) {
      // Laravel is up but rejected the token — try the in-memory fallback
      // (the token may have been issued by the in-memory login path).
      return resolveInMemory(token);
    }

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
    // Backend unreachable / network error → fall back to in-memory sessions.
    return resolveInMemory(token);
  }
}

function resolveInMemory(token: string): ConductorSession | null {
  const user = resolveSessionInMemory(token);
  if (!user || user.role !== "CONDUCTOR") return null;
  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
}

export function unauthorizedResponse() {
  return jsonError("Unauthorized. Conductor session required.", 401);
}
