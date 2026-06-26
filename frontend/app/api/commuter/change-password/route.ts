import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/change-password
 *
 * Body: `{ current_password, password, password_confirmation }`.
 *
 * Proxies to Laravel `POST /api/v1/commuter/change-password` (cookie auth via
 * `chatco_session`). The Laravel response — including 422 validation cases
 * (wrong current password, password reuse, weak password, mismatched
 * confirmation) — is passed through verbatim so the service layer can surface
 * field-level errors next to the right input.
 *
 * On success Laravel returns `{ success: true, data: null, message: "..." }`
 * with HTTP 200; the commuter's other sessions are revoked server-side but
 * the current session stays valid.
 *
 * Backend (S5-T1): CommuterController::changePassword →
 * CommuterService::changePassword
 */
export async function POST(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/change-password`, {
    method: "POST",
    body: await request.text(),
  });
}
