import type { NextRequest } from "next/server";
import { API_V1, proxyToLaravel } from "@/lib/commuter/server/proxy";

/**
 * GET /api/vehicles/locations
 *
 * Same-origin proxy to Laravel `GET /api/v1/vehicles/locations` (auth:sanctum,
 * any role). Reads the httpOnly chatco_session cookie and forwards it as a
 * Bearer token, then passes the response through verbatim (the `{ data: [...] }`
 * envelope the commuter map's useVehicleLocations expects).
 */
export async function GET(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/vehicles/locations`, { method: "GET" });
}
