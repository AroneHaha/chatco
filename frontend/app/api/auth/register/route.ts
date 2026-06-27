import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/auth/register
 * PUBLIC — no auth required. Proxies to Laravel POST /api/v1/auth/register.
 *
 * Creates a new commuter account with account_status=PENDING. The commuter
 * cannot log in until an admin approves the registration.
 *
 * Body (multipart or JSON):
 *   first_name, middle_name?, surname, birthdate, gender, email,
 *   contact_number, username, password, password_confirmation,
 *   language_preference?, applied_type (REGULAR|STUDENT|SENIOR|PWD),
 *   id_image (base64 data URI or path)
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, "/auth/register", {
    method: "POST",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(
        result.message ?? "Validation failed.",
        result.errors,
        422
      );
    }
    return jsonError(result.message ?? "Failed to register.", result.status);
  }
  return jsonData(result.data, 201);
}
