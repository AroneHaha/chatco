import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { resolveSessionInMemory } from "@/lib/shared/server/inmemory-backend";
import { resolveCrewForVehicleInMemory } from "@/lib/shared/server/inmemory-backend";

/**
 * POST /api/qr/scan-public
 *
 * Commuter-side crew resolution for the PERMANENT unit-QR. The commuter
 * scans the QR printed inside the jeepney; the frontend parses the JSON
 * payload and sends just the `vehicle_id` here. The backend resolves
 * TODAY's driver + conductor from shift_logs and returns the `shift_id`
 * needed for the subsequent POST /commuter/feedback.
 *
 * PRIMARY: forwards to Laravel `POST /api/v1/qr/scan-public` (role:COMMUTER).
 * FALLBACK: when Laravel is unreachable, resolves today's crew from the
 * in-memory shift store (the shift the conductor created at login). This
 * closes the commuter → conductor feedback loop in the sandbox preview.
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

  // Laravel rejected with a real error (validation/404) — surface it.
  if (result.status !== 502) {
    return jsonError(
      result.message ?? "Unable to resolve crew for this unit.",
      result.status
    );
  }

  // ─── In-memory fallback (Laravel unreachable) ──────────────────────
  // Gate on the commuter session (role:COMMUTER) — mirrors Laravel middleware.
  const token = request.cookies.get("chatco_session")?.value;
  const commuter = resolveSessionInMemory(token);
  if (!commuter || commuter.role !== "COMMUTER") {
    return jsonError("Unauthorized. Commuter session required.", 401);
  }

  const vehicleId = body.vehicle_id;
  if (!vehicleId) {
    return jsonError("vehicle_id is required.", 422);
  }

  const shift = resolveCrewForVehicleInMemory(vehicleId);
  if (!shift) {
    return jsonError("No active crew for this unit today", 404);
  }

  return jsonData({
    shift_id: shift.shiftId,
    vehicle_id: shift.vehicleId,
    unit_number: shift.unitNumber,
    plate_number: shift.plateNumber,
    driver_id: shift.driverId,
    driver_name: shift.driverName,
    conductor_id: shift.conductorId,
    conductor_name: shift.conductorName,
  });
}
