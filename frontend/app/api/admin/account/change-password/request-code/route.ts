import { NextRequest } from "next/server";
import { jsonData, jsonError, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/admin/account/change-password/request-code
 *
 * Body: `{ current_password, password, password_confirmation }`.
 *
 * Phase 1 of the signed-in admin's password change: Laravel verifies the
 * current/new password and emails a 6-digit code to the admin's OWN address.
 * The password is NOT changed by this call. 422 (bad password) keeps its
 * field errors; 429 (resend cooldown) and 502 (mail failure) keep Laravel's
 * message.
 *
 * Backend: PasswordChangeController::requestCode
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => undefined);

  const result = await proxyToLaravel(request, "/admin/account/change-password/request-code", {
    method: "POST",
    body,
  });

  if (!result.ok && result.status === 422) {
    return jsonValidationError(result.message ?? "Validation failed.", result.errors);
  }
  if (!result.ok) return jsonError(result.message ?? "Failed to send the verification code.", result.status);

  return jsonData(result.data);
}
