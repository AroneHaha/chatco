import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapDriver, mapArray } from "@/lib/conductor/server/mappers";

/**
 * GET /api/conductor/drivers
 *
 * Proxies to Laravel `GET /api/v1/conductor/drivers` (role:CONDUCTOR).
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/drivers");

  if (result.ok) {
    const drivers = mapArray(result.data, mapDriver);
    return jsonData(drivers);
  }

  return jsonError(result.message ?? "Unable to load drivers.", result.status);
}
