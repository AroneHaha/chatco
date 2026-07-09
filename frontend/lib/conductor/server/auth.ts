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
 * Validates the token against Laravel `GET /api/v1/user` (guarded by
 * `auth:sanctum`). If the authenticated user's role is `CONDUCTOR`, returns a
 * {@link ConductorSession}; otherwise (rejected token or unreachable backend)
 * returns null.
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
      // Laravel is up but rejected the token.
      return null;
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
    // Backend unreachable / network error.
    return null;
  }
}

export function unauthorizedResponse() {
  return jsonError("Unauthorized. Conductor session required.", 401);
}
