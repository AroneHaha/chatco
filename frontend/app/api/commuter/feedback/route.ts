import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

/**
 * POST /api/commuter/feedback
 *
 * Sprint 6 (S6-T7) — Commuter post-ride feedback submission.
 *
 * Proxies to Laravel `POST /api/v1/commuter/feedback` (role:COMMUTER). The
 * backend derives driver_id + conductor_id + vehicle_id from the shift_log
 * row (never trusts client input), stamps commuter_id = auth()->id(), and
 * enforces one-feedback-per-shift via a unique constraint.
 *
 * Response: Laravel envelope `{ success, data, message }` where `data` is the
 * freshly-created Feedback row.
 *   201 — created
 *   409 — "You have already submitted feedback for this shift" (duplicate)
 *   422 — validation (rating out of range, shift_id missing/unknown, …)
 *   401 — session expired
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated.", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }

  const rawBody = await request.text();

  // ─── Try Laravel first ─────────────────────────────────────────────
  try {
    const res = await fetch(`${API_URL}${API_V1}/commuter/feedback`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: rawBody,
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
