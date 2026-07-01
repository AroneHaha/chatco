import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { getConductorProfileInMemory } from "@/lib/shared/server/inmemory-backend";

/**
 * GET /api/conductor/profile
 *
 * PRIMARY: proxies the conductor profile from Laravel `GET /api/v1/conductor/profile`.
 * FALLBACK: when Laravel is unreachable, returns the in-memory conductor profile
 * (derived from the session) so the conductor dashboard renders correctly.
 */
const API_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return jsonError("Unauthorized. Conductor session required.", 401);
  }

  // ─── Try Laravel first ─────────────────────────────────────────────
  try {
    const res = await fetch(`${API_URL}/api/v1/conductor/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (res.ok) {
      const body = await res.json();
      return jsonData(body?.data ?? null);
    }
    // Laravel rejected the token — fall through to in-memory.
  } catch {
    // Laravel unreachable — fall through to in-memory.
  }

  // ─── In-memory fallback ────────────────────────────────────────────
  const session = await getConductorSession(request);
  if (!session) return unauthorizedResponse();

  const profile = getConductorProfileInMemory(session.userId);
  if (!profile) return unauthorizedResponse();

  return jsonData(profile);
}
