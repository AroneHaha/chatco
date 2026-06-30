import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/commuter/feedback/history
 *
 * Sprint 6 (S6-T7) — The authenticated commuter's own feedback history.
 *
 * Proxies to Laravel GET /api/v1/commuter/feedback (the same path as the
 * POST, different verb — REST-style resource). Forwards the `per_page`
 * query param verbatim. The backend always scopes to commuter_id =
 * auth()->id() (never trusts client input), so a commuter can only ever
 * see their own feedback.
 *
 * The frontend fetches this once when the Payment History modal opens,
 * builds a { shift_id → feedback } map, and uses it to mark each PAID ride
 * row as "Feedback submitted" (read-only) or "Leave Feedback" (submit).
 *
 * Auth: chatco_session cookie → Bearer token (proxyToLaravel).
 * Role:COMMUTER enforced at the Laravel route group.
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search; // e.g. "?per_page=100"
  return proxyToLaravel(request, `${API_V1}/commuter/feedback${qs}`, {
    method: "GET",
  });
}
