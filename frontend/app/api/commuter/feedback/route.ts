import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/feedback
 *
 * Sprint 6 (S6-T7) — Commuter post-ride feedback submission.
 *
 * Proxies to Laravel POST /api/v1/commuter/feedback, forwarding the
 * { shift_id, rating, comment? } body verbatim. The backend derives
 * driver_id + conductor_id + vehicle_id from the shift_log row (never
 * trusts client input for those), stamps commuter_id = auth()->id(), and
 * enforces one-feedback-per-shift via a unique constraint.
 *
 * Response codes (passed through to the client service):
 *   201 — created (returns the Feedback row)
 *   409 — "You have already submitted feedback for this shift" (duplicate)
 *   422 — validation (rating out of range, shift_id missing/unknown, …)
 *   403 — caller is not a COMMUTER
 *   401 — session expired
 *
 * Auth: the commuter's Sanctum token is read from the `chatco_session`
 * cookie by proxyToLaravel and forwarded as `Authorization: Bearer`.
 * Role:COMMUTER is enforced at the Laravel route group.
 */
export async function POST(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/feedback`, {
    method: "POST",
    body: await request.text(),
  });
}
