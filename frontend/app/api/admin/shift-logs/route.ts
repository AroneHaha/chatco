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
  const url = new URL(request.url);
  const vehicleId = url.searchParams.get("vehicle_id");
  const conductorId = url.searchParams.get("conductor_id");
  const driverId = url.searchParams.get("driver_id");

  let laravelPath = "/admin/shift-logs";
  const params = new URLSearchParams();
  if (vehicleId) params.append("vehicle_id", vehicleId);
  if (conductorId) params.append("conductor_id", conductorId);
  if (driverId) params.append("driver_id", driverId);
  if (params.toString()) laravelPath += `?${params.toString()}`;

  const result = await proxyToLaravel(request, laravelPath, {
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
