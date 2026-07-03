import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapVehicle, mapArray } from "@/lib/conductor/server/mappers";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { listUnitsInMemory } from "@/lib/shared/server/inmemory-backend";

/**
 * GET /api/conductor/units
 *
 * PRIMARY: proxies to Laravel `GET /api/v1/conductor/units` (role:CONDUCTOR).
 * FALLBACK: when Laravel is unreachable, returns the in-memory vehicle list
 * (available + in-use units) so the conductor unit-verification screen keeps
 * working in the sandbox preview.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/units");

  if (result.ok) {
    const units = mapArray(result.data, mapVehicle);
    return jsonData(units);
  }

  // Laravel unreachable (502) → in-memory fallback (still gated on conductor session).
  if (result.status === 502) {
    const session = await getConductorSession(request);
    if (!session) return unauthorizedResponse();
    const units = listUnitsInMemory().map((v) => ({
      id: v.id,
      unitNumber: v.unitNumber,
      plateNumber: v.plateNumber,
      route: v.route,
      status: v.status,
    }));
    return jsonData(units);
  }

  return jsonError(result.message ?? "Unable to load units.", result.status);
}
