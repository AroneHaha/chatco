import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";

/**
 * POST /api/conductor/shifts/start
 *
 * Proxies to Laravel `POST /api/v1/conductor/shifts/start` (guarded by
 * `auth:sanctum` + `role:CONDUCTOR`).
 *
 * REQUEST MAPPING
 * ---------------
 * The frontend sends `{ unitId, driverId, routeId? }` (UUIDs from the
 * real Vehicle/Driver records fetched via /units and /drivers). Laravel's
 * `StartShiftRequest` validates `{ vehicle_id, driver_id, route_id? }`,
 * so we remap the keys here.
 *
 * `ShiftService::startShift()` creates the `shift_logs` row inside a DB
 * transaction (setting `status=ACTIVE`, `time_in=now()`, denormalizing
 * conductor/driver/plate names), and marks the vehicle + driver as busy
 * via `active_shift_id`.
 *
 * RESPONSE MAPPING
 * ----------------
 * Laravel returns the `ShiftLog` model (eager-loaded with vehicle, driver,
 * route). We map it to the frontend's `ConductorShift` shape.
 */
export async function POST(request: NextRequest) {
  let body: { unitId?: string; driverId?: string; routeId?: string };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const { unitId, driverId, routeId } = body;

  if (!unitId || !driverId) {
    return jsonError("unitId and driverId are required.", 422);
  }

  const result = await proxyToLaravel(request, "/conductor/shifts/start", {
    method: "POST",
    body: {
      vehicle_id: unitId,
      driver_id: driverId,
      route_id: routeId ?? null,
    },
  });

  if (!result.ok) {
    return jsonError(
      result.message ?? "Unable to start shift.",
      result.status
    );
  }

  const shift = mapShiftLog(result.data);
  return jsonData(shift, 201);
}
