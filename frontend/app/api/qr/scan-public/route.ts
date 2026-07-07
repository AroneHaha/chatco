import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/qr/scan-public
 *
 * Commuter-side crew resolution for the PERMANENT unit-QR. The commuter
 * scans the QR printed inside the jeepney; the frontend parses the JSON
 * payload and sends just the `vehicle_id` here. The backend resolves
 * TODAY's driver + conductor from shift_logs and returns the `shift_id`
 * needed for the subsequent POST /commuter/feedback.
 *
 * Forwards to Laravel `POST /api/v1/qr/scan-public` (role:COMMUTER).
 */
export async function POST(request: NextRequest) {
  let body: { vehicle_id?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  // ─── Try Laravel first ─────────────────────────────────────────────
  const result = await proxyToLaravel(request, "/qr/scan-public", {
    method: "POST",
    body,
  });

  if (result.ok) {
    return jsonData(result.data);
  }

  return jsonError(
    result.message ?? "Unable to resolve crew for this unit.",
    result.status
  );
}
