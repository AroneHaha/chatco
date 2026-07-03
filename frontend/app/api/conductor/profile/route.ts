import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

/**
 * GET /api/conductor/profile
 *
 * Proxies the conductor profile from Laravel `GET /api/v1/conductor/profile`.
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
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (res.ok) {
      const body = await res.json();
      return jsonData(body?.data ?? null);
    }
    // Laravel rejected the token.
    return jsonError("Unauthorized. Conductor session required.", 401);
  } catch {
    // Laravel unreachable.
    return jsonError("Unable to reach the backend service. Please try again.", 502);
  }
}
