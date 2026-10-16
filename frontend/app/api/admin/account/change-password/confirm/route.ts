import { NextRequest } from "next/server";
import { jsonData, jsonError, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/admin/account/change-password/confirm
 *
 * Body: `{ current_password, password, password_confirmation, code }`.
 *
 * Phase 2: Laravel re-verifies the passwords plus the emailed code, rotates
 * the password and signs the admin out of every other session (this one
 * stays valid). 422s keep their field errors (current_password / password /
 * code) so the form can point at the right input.
 *
 * Backend: PasswordChangeController::confirm
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => undefined);

  const result = await proxyToLaravel(request, "/admin/account/change-password/confirm", {
    method: "POST",
    body,
  });

  if (!result.ok && result.status === 422) {
    return jsonValidationError(result.message ?? "Validation failed.", result.errors);
  }
  if (!result.ok) return jsonError(result.message ?? "Failed to update the password.", result.status);

  return jsonData(result.data);
}
