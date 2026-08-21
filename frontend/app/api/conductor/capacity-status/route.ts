import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

/**
 * POST /api/conductor/capacity-status
 *
 * Proxies the conductor's chosen unit capacity (AVAILABLE | STANDING | FULL)
 * to Laravel `POST /api/v1/conductor/capacity-status`. The backend upserts
 * `vehicle_locations.capacity_status` for the vehicle on the active shift and
 * fires the `VehicleLocationUpdated` broadcast — which recolors this unit on
 * every commuter's map (green / yellow / red) in real time.
 */
export async function POST(request: NextRequest) {
  let body: { capacity_status?: unknown; deviceId?: unknown; deviceType?: unknown };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const status = body.capacity_status;
  if (status !== "AVAILABLE" && status !== "STANDING" && status !== "FULL") {
    return jsonError("capacity_status must be AVAILABLE, STANDING, or FULL.", 422);
  }

  const result = await proxyToLaravel(request, "/conductor/capacity-status", {
    method: "POST",
    body: {
      capacity_status: status,
      device_id: typeof body.deviceId === "string" ? body.deviceId : undefined,
      device_type: body.deviceType === "WEB" || body.deviceType === "MOBILE" ? body.deviceType : undefined,
    },
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Unable to update unit status.", result.status);
  }

  return jsonData(result.data);
}
