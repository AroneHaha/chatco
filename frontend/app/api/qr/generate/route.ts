import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/qr/generate
 *
 * Admin-only endpoint that issues an HMAC-signed unit-QR for a jeepney
 * vehicle. The admin picks a vehicle, the backend signs a token that
 * encodes the vehicle_id + TTL, and returns `{ token, expires_at, ... }`.
 *
 * Forwards to Laravel POST /api/v1/qr/generate (role:ADMIN).
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, "/qr/generate", {
    method: "POST",
    body,
  });

  if (!result.ok) {
    // 422 = Laravel validation failure (e.g. vehicle_id missing or doesn't exist)
    if (result.status === 422) {
      return jsonValidationError(
        result.message ?? "Validation failed.",
        result.errors,
        422
      );
    }
    return jsonError(
      result.message ?? "Failed to generate QR token.",
      result.status
    );
  }

  // 201 from Laravel — pass through with the same status so the service
  // layer can distinguish "created" from a generic 200.
  return jsonData(result.data, 201);
}
