import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";

export async function POST(request: NextRequest) {
  let body: { unitId?: string; driverId?: string; routeId?: string };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const { unitId, driverId, routeId } = body;

  if (!unitId || !driverId) {
    return jsonError("unitId and driverId are required.", 422);
  }

  const result = await proxyToLaravel(request, "/conductor/shifts/start", {
    method: "POST",
    body: {
      vehicle_id: unitId,
      driver_id: driverId,
      route_id: routeId ?? null,
    },
  });

  if (!result.ok) {
    return jsonError(
      result.message ?? "Unable to start shift.",
      result.status
    );
  }

  const shift = mapShiftLog(result.data);
  return jsonData(shift, 201);
}
