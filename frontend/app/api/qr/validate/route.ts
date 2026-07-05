import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/qr/validate
 *
 * Commuter-side pre-check: verify a scanned QR token's signature + expiry
 * WITHOUT resolving the crew. Used to fail fast on tampered/expired tokens
 * before the heavier `/qr/scan` lookup.
 *
 * Forwards to Laravel POST /api/v1/qr/validate (role:COMMUTER).
 *
 * Response envelope:
 *   { data: { valid, vehicle_id, issued_at, expires_at } }
 *
 * Errors:
 *   422 — Invalid signature / expired / malformed token (Laravel returns
 *         a `message` field with the specific reason; we forward it).
 *   401 — Unauthenticated (session expired).
 *   403 — Non-commuter role.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, "/qr/validate", {
    method: "POST",
    body,
  });

  if (!result.ok) {
    // 422 from Laravel carries the specific reason ("Invalid signature",
    // "Token expired", "Malformed token") in `message` — forward as-is.
    return jsonError(
      result.message ?? "QR token is not valid.",
      result.status
    );
  }

  return jsonData(result.data);
}
