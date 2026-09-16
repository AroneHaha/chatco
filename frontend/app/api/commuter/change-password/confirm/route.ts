import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/change-password/confirm
 *
 * Body: `{ current_password, password, password_confirmation, code }`.
 *
 * Proxies to Laravel `POST /api/v1/commuter/change-password/confirm` (cookie
 * auth via `chatco_session`). Phase 2 of the two-step change-password flow:
 * Laravel re-verifies the current/new password plus the 6-digit code emailed
 * by .../request-code, and only then rotates the password. The Laravel
 * response — including 422 validation cases (wrong current password,
 * password reuse, weak password, mismatched confirmation, or a
 * wrong/expired/locked code) — is passed through verbatim so the service
 * layer can surface field-level errors next to the right input.
 *
 * On success Laravel returns `{ success: true, data: null, message: "..." }`
 * with HTTP 200; the commuter's other sessions are revoked server-side but
 * the current session stays valid.
 *
 * Backend: CommuterController::confirmPasswordChange →
 * CommuterService::confirmPasswordChange
 */
export async function POST(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/change-password/confirm`, {
    method: "POST",
    body: await request.text(),
  });
}
