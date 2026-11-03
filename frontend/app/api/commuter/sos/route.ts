import { NextRequest, NextResponse } from "next/server";
import { API_V1, proxyToLaravel } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/sos
 *
 * Sprint 6 (S6-T10) — commuter triggers an emergency SOS alert.
 *
 * Forwards { lat, lng, note? } to Laravel POST /api/v1/commuter/sos, which
 * validates (lat -90..90, lng -180..180, note ≤ 500 chars), creates an
 * ACTIVE SosAlert scoped to the auth commuter, and returns the alert with
 * the `commuter` relation loaded.
 *
 * The commuter proxy forwards Laravel's status + body verbatim, so:
 *   - 201 new alert / 200 the commuter's already-open alert → `{ data: alert }`
 *   - 422 `{ error: 'outside_radius', message, emergency_hotline }` when no
 *     on-duty unit is within 100 m — passed through INTACT so the modal can
 *     branch on `error` (re-wrapping it would drop the discriminator)
 *   - 422 validation / 429 throttle → forwarded as-is
 *
 * The Sanctum bearer token is read from the httpOnly `chatco_session`
 * cookie by the proxy — the client never sees the token.
 *
 * Role:COMMUTER enforced at the Laravel /commuter route group.
 * Rate-limited on the Laravel side (throttle:sos): 1 created alert/min.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  return proxyToLaravel(request, `${API_V1}/commuter/sos`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
