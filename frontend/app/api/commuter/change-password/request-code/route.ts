import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/change-password/request-code
 *
 * Body: `{ current_password, password, password_confirmation }`.
 *
 * Proxies to Laravel `POST /api/v1/commuter/change-password/request-code`
 * (cookie auth via `chatco_session`). Phase 1 of the two-step change-password
 * flow: Laravel verifies the current/new password and emails a 6-digit code
 * to the commuter's OWN registered address — the password is NOT changed by
 * this call. The Laravel response, including 422 (bad password), 429
 * (resend cooldown), and 502 (mail send failure), is passed through verbatim.
 *
 * Backend: CommuterController::requestPasswordChangeCode →
 * CommuterService::requestPasswordChangeCode
 */
export async function POST(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/change-password/request-code`, {
    method: "POST",
    body: await request.text(),
  });
}
