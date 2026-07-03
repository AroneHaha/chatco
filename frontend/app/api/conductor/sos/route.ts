import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/conductor/sos
 *
 * Conductor triggers an emergency SOS alert (mirrors the commuter flow).
 *
 * Forwards { lat, lng, note? } to Laravel POST /api/v1/conductor/sos, which
 * validates (lat -90..90, lng -180..180, note ≤ 500 chars), creates an ACTIVE
 * SosAlert with sender_role=CONDUCTOR scoped to the auth conductor, and returns
 * the alert with the `conductor` relation loaded.
 *
 * The Sanctum bearer token is read from the httpOnly `chatco_session` cookie by
 * the proxy — the client never sees the token. Role:CONDUCTOR is enforced at
 * the Laravel /conductor route group; mutation-throttled on the Laravel side.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const result = await proxyToLaravel(request, "/conductor/sos", {
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
    return jsonError(result.message ?? "Failed to trigger SOS.", result.status);
  }
  return jsonData(result.data, 201);
}
