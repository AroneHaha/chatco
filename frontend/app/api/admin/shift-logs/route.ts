import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/shift-logs
 *
 * Proxies to Laravel GET /api/v1/admin/shift-logs.
 * Supports optional query params: ?vehicle_id=, ?conductor_id=, ?driver_id=
 * Returns matching shift logs with vehicle, driver, and route relationships.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, `/admin/shift-logs${request.nextUrl.search}`, {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(
      result.message ?? "Failed to load shift logs.",
      result.status
    );
  }

  return jsonData(result.data);
}
