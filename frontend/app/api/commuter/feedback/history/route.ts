import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

/**
 * GET /api/commuter/feedback/history
 *
 * Sprint 6 (S6-T7) — The authenticated commuter's own feedback history.
 * Proxies to Laravel `GET /api/v1/commuter/feedback`.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated.", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }

  const qs = request.nextUrl.search; // e.g. "?page=2&per_page=20"

  // ─── Try Laravel first ─────────────────────────────────────────────
  try {
    const res = await fetch(`${API_URL}${API_V1}/commuter/feedback${qs}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const body = await res.json().catch(() => null);
    return NextResponse.json(body ?? { success: false, message: "Request failed.", data: null, errors: null, meta: null }, {
      status: res.status,
    });
  } catch {
    // Laravel unreachable.
    return NextResponse.json(
      { success: false, message: "Unable to reach the backend service. Please try again.", data: null, errors: null, meta: null },
      { status: 502 }
    );
  }
}
