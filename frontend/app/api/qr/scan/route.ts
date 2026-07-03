import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/qr/scan
 *
 * Commuter-side crew resolution: verify the scanned token AND look up
 * today's driver + conductor from `shift_logs` for the resolved vehicle.
 * Returns the `shift_id` needed for the subsequent POST /commuter/feedback.
 *
 * Forwards to Laravel POST /api/v1/qr/scan (role:COMMUTER).
 *
 * Response envelope:
 *   { data: { shift_id, vehicle_id, unit_number, plate_number,
 *             driver_id, driver_name, conductor_id, conductor_name } }
 *
 * Errors:
 *   422 — Invalid signature / expired / malformed token.
 *   404 — No active crew for this vehicle today (vehicle has no shift_logs
 *         row for today). Surfaced as a friendly "no crew today" message.
 *   401 — Unauthenticated.
 *   403 — Non-commuter role.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, "/qr/scan", {
    method: "POST",
    body,
  });

  if (!result.ok) {
    // 422 (invalid/expired token) + 404 (no crew today) both carry a
    // human-readable `message` from Laravel — forward as-is so the
    // service layer can branch on status code.
    return jsonError(
      result.message ?? "Unable to resolve crew from QR token.",
      result.status
    );
  }

  return jsonData(result.data);
}
