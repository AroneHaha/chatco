import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";

/**
 * GET /api/conductor/shifts/active
 *
 * Proxies to Laravel `GET /api/v1/conductor/shift` (guarded by
 * `auth:sanctum` + `role:CONDUCTOR`).
 *
 * Laravel's `ConductorController::shiftStatus()` returns the conductor's
 * current active `ShiftLog` (eager-loaded with vehicle/driver/route), or
 * `null` if no shift is active.
 *
 * The unit-verification page calls this on mount to redirect conductors
 * with an active shift straight to the dashboard (prevents double shifts).
 * The conductor dashboard calls it to display the live shift card.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/shift");

  if (!result.ok) {
    return jsonError(
      result.message ?? "Unable to check active shift.",
      result.status
    );
  }

  // Laravel returns data: null when no active shift.
  if (!result.data) {
    return jsonData(null);
  }

  const shift = mapShiftLog(result.data);
  return jsonData(shift);
}
