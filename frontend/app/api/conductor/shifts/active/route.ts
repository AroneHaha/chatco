import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { getActiveShiftInMemory } from "@/lib/shared/server/inmemory-backend";

/**
 * GET /api/conductor/shifts/active
 *
 * PRIMARY: proxies to Laravel `GET /api/v1/conductor/shift` (role:CONDUCTOR).
 * FALLBACK: when Laravel is unreachable, returns the in-memory active shift
 * for the logged-in conductor (or null), so the unit-verification redirect +
 * dashboard shift card keep working.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/shift");

  if (result.ok) {
    if (!result.data) return jsonData(null);
    const shift = mapShiftLog(result.data);
    return jsonData(shift);
  }

  if (result.status === 502) {
    const session = await getConductorSession(request);
    if (!session) return unauthorizedResponse();
    const shift = getActiveShiftInMemory(session.userId);
    if (!shift) return jsonData(null);
    return jsonData({
      shiftId: shift.shiftId,
      conductorName: shift.conductorName,
      unitNumber: shift.unitNumber,
      plateNumber: shift.plateNumber,
      route: shift.route,
      driverName: shift.driverName,
      timeIn: shift.timeIn,
      timeOut: shift.timeOut,
      isActive: shift.isActive,
    });
  }

  return jsonError(result.message ?? "Unable to check active shift.", result.status);
}
