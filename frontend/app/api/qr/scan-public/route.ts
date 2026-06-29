import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/qr/scan-public
 *
 * Commuter-side crew resolution for the PERMANENT unit-QR. The commuter
 * scans the QR printed inside the jeepney; the frontend parses the JSON
 * payload and sends just the `vehicle_id` here. The backend resolves
 * TODAY's driver + conductor from shift_logs (no signature/expiry — the
 * QR is permanent by design). Returns the `shift_id` needed for the
 * subsequent POST /commuter/feedback.
 *
 * Forwards to Laravel POST /api/v1/qr/scan-public (role:COMMUTER).
 *
 * Response envelope:
 *   { data: { shift_id, vehicle_id, unit_number, plate_number,
 *             driver_id, driver_name, conductor_id, conductor_name } }
 *
 * Errors:
 *   404 — No active crew for this vehicle today (no shift_logs row for
 *         today). Surfaced as a friendly "no crew today" message.
 *   422 — Missing/invalid vehicle_id (validation).
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

  const result = await proxyToLaravel(request, "/qr/scan-public", {
    method: "POST",
    body,
  });

  if (!result.ok) {
    // 404 (no crew today) + 422 (validation) both carry a human-readable
    // `message` from Laravel — forward as-is so the service layer can
    // branch on status code.
    return jsonError(
      result.message ?? "Unable to resolve crew for this unit.",
      result.status
    );
  }

  return jsonData(result.data);
}
