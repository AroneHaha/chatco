import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapDriver, mapArray } from "@/lib/conductor/server/mappers";

/**
 * GET /api/conductor/drivers
 *
 * Proxies to Laravel `GET /api/v1/conductor/drivers` (guarded by
 * `auth:sanctum` + `role:CONDUCTOR`). Laravel returns `Driver` records
 * that are not currently on an active shift.
 *
 * Mapped from Eloquent `Driver[]` to `ConductorDriver[]`.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/drivers");

  if (!result.ok) {
    return jsonError(
      result.message ?? "Unable to load drivers.",
      result.status
    );
  }

  const drivers = mapArray(result.data, mapDriver);
  return jsonData(drivers);
}
