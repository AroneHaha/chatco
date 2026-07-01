import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { startShiftInMemory } from "@/lib/shared/server/inmemory-backend";

/**
 * POST /api/conductor/shifts/start
 *
 * PRIMARY: proxies to Laravel `POST /api/v1/conductor/shifts/start`
 * (role:CONDUCTOR). The frontend sends `{ unitId, driverId, routeId? }`;
 * Laravel's `StartShiftRequest` validates `{ vehicle_id, driver_id, route_id? }`,
 * so the keys are remapped here.
 *
 * FALLBACK: when Laravel is unreachable, starts an in-memory shift. The shift
 * carries driver_id + conductor_id + vehicle_id (the crew snapshot) so the
 * commuter's subsequent QR scan + feedback submission can stamp the rating to
 * BOTH the driver and the conductor — mirroring ShiftService::startShift +
 * FeedbackService::submit.
 *
 * RESPONSE: the frontend's `ConductorShift` shape
 *   `{ shiftId, conductorName, unitNumber, route, driverName, timeIn, timeOut, isActive }`.
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

  // ─── Try Laravel first ─────────────────────────────────────────────
  const result = await proxyToLaravel(request, "/conductor/shifts/start", {
    method: "POST",
    body: {
      vehicle_id: unitId,
      driver_id: driverId,
      route_id: routeId ?? null,
    },
  });

  if (result.ok) {
    const shift = mapShiftLog(result.data);
    return jsonData(shift, 201);
  }

  // Laravel rejected the request with a real error (not a network failure) — surface it.
  if (result.status !== 502) {
    return jsonError(result.message ?? "Unable to start shift.", result.status);
  }

  // ─── In-memory fallback (Laravel unreachable) ──────────────────────
  const session = await getConductorSession(request);
  if (!session) return unauthorizedResponse();

  try {
    const shift = startShiftInMemory(session.userId, {
      vehicleId: unitId,
      driverId,
      routeId: routeId ?? null,
    });
    return jsonData(
      {
        shiftId: shift.shiftId,
        conductorName: shift.conductorName,
        unitNumber: shift.unitNumber,
        plateNumber: shift.plateNumber,
        route: shift.route,
        driverName: shift.driverName,
        timeIn: shift.timeIn,
        timeOut: shift.timeOut,
        isActive: shift.isActive,
      },
      201
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to start shift.",
      409
    );
  }
}
