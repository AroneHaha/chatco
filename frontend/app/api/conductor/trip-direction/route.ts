import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";

/** POST /api/conductor/trip-direction → Laravel; body { trip_direction: "FORWARD" | "REVERSE" }. */
export async function POST(request: NextRequest) {
  let body: { trip_direction?: unknown; deviceId?: unknown; deviceType?: unknown };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  if (body.trip_direction !== "FORWARD" && body.trip_direction !== "REVERSE") {
    return jsonError("trip_direction must be FORWARD or REVERSE.", 422);
  }

  const result = await proxyToLaravel(request, "/conductor/trip-direction", {
    method: "POST",
    body: {
      trip_direction: body.trip_direction,
      device_id: typeof body.deviceId === "string" ? body.deviceId : undefined,
      device_type: body.deviceType === "WEB" || body.deviceType === "MOBILE" ? body.deviceType : undefined,
    },
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Unable to update trip direction.", result.status);
  }

  return jsonData(mapShiftLog(result.data));
}
