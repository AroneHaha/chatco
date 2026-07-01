import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapDriver, mapArray } from "@/lib/conductor/server/mappers";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { listDriversInMemory } from "@/lib/shared/server/inmemory-backend";

/**
 * GET /api/conductor/drivers
 *
 * PRIMARY: proxies to Laravel `GET /api/v1/conductor/drivers` (role:CONDUCTOR).
 * FALLBACK: when Laravel is unreachable, returns the in-memory available
 * drivers so the conductor can still select a driver when starting a shift.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/drivers");

  if (result.ok) {
    const drivers = mapArray(result.data, mapDriver);
    return jsonData(drivers);
  }

  if (result.status === 502) {
    const session = await getConductorSession(request);
    if (!session) return unauthorizedResponse();
    const drivers = listDriversInMemory().map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
    }));
    return jsonData(drivers);
  }

  return jsonError(result.message ?? "Unable to load drivers.", result.status);
}
