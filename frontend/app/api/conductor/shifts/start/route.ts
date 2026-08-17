import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";

/**
 * POST /api/conductor/shifts/start
 *
 * Proxies to Laravel `POST /api/v1/conductor/shifts/start` (role:CONDUCTOR).
 * The frontend sends `{ unitId, driverId, routeId? }`; Laravel's
 * `StartShiftRequest` validates `{ vehicle_id, driver_id, route_id? }`, so the
 * keys are remapped here.
 *
 * RESPONSE: the frontend's `ConductorShift` shape
 *   `{ shiftId, conductorName, unitNumber, route, driverName, timeIn, timeOut, isActive }`.
 */
export async function POST(request: NextRequest) {
  let body: { unitId?: string; driverId?: string; routeId?: string; deviceId?: string; deviceType?: string };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const { unitId, driverId, routeId, deviceId, deviceType } = body;

  if (!unitId || !driverId) {
    return jsonError("unitId and driverId are required.", 422);
  }

  // ─── Try Laravel first ─────────────────────────────────────────────
  const result = await proxyToLaravel(request, "/conductor/shifts/start", {
    method: "POST",
    body: {
      vehicle_id: unitId,
      driver_id: driverId,
      route_id: routeId ?? null,
      device_id: deviceId,
      device_type: deviceType,
    },
  });

  if (result.ok) {
    const shift = mapShiftLog(result.data);
    return jsonData(shift, 201);
  }

  return jsonError(result.message ?? "Unable to start shift.", result.status);
}
