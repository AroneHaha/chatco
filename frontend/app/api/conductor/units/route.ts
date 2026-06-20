import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapVehicle, mapArray } from "@/lib/conductor/server/mappers";

/**
 * GET /api/conductor/units
 *
 * Proxies to Laravel `GET /api/v1/conductor/units` (guarded by
 * `auth:sanctum` + `role:CONDUCTOR`). Laravel returns the list of
 * `Vehicle` records that are ACTIVE and not currently on a shift.
 *
 * The response is mapped from Eloquent `Vehicle[]` to the frontend's
 * `ConductorUnit[]` shape so the unit-verification UI gets real DB
 * records (with real UUIDs) instead of mock seed data.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/units");

  if (!result.ok) {
    return jsonError(
      result.message ?? "Unable to load units.",
      result.status
    );
  }

  const units = mapArray(result.data, mapVehicle);
  return jsonData(units);
}
