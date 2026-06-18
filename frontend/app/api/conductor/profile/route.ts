import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

/**
 * GET /api/conductor/profile
 *
 * Proxies the conductor profile request to the Laravel backend's
 * `GET /api/conductor/profile` endpoint (guarded by `auth:sanctum` +
 * `role:CONDUCTOR`).
 *
 * WHY THIS IS A PROXY NOW
 * -----------------------
 * Previously this route was a mock stub that read a prototype-only
 * `chatco:{id}:{role}` cookie and returned hard-coded seed data. After the
 * Sanctum auth integration the cookie holds a bearer token, so the stub
 * always returned 401. Rather than re-implement auth parsing here, we
 * forward the Sanctum token to Laravel — which already owns the canonical
 * conductor profile data (`ConductorController::profile`) — and pass the
 * `data` envelope straight back to the frontend client.
 *
 * The frontend `ConductorProfile` type only requires `{ id, name }`; the
 * backend also returns `email` and `role`, which the frontend ignores
 * safely.
 */
const API_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return jsonError("Unauthorized. Conductor session required.", 401);
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/conductor/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return jsonError(
        "Unable to load conductor profile. Please try again.",
        res.status
      );
    }

    const body = await res.json();
    // Laravel ApiResponse envelope: { success, data: { id, name, … }, … }
    return jsonData(body?.data ?? null);
  } catch {
    return jsonError(
      "Unable to reach the conductor profile service. Please try again.",
      502
    );
  }
}
