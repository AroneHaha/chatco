import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

/**
 * GET /api/share/{token}
 *
 * PUBLIC endpoint — no auth required. Returns the commuter's latest
 * position if the link is active + not expired.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return jsonError("Token is missing.", 400);
  }

  const API_URL = process.env.API_URL || "http://localhost:8000";
  const API_V1 = "/api/v1";

  try {
    const res = await fetch(`${API_URL}${API_V1}/share/${encodeURIComponent(token)}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return jsonError("Tracking link not found.", res.status);
    }

    const body = await res.json();
    return jsonData(body.data ?? null);
  } catch {
    return jsonError("Unable to reach the backend service.", 502);
  }
}
