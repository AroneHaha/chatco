import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

/**
 * POST /api/conductor/location
 *
 * Proxies the conductor's GPS to Laravel `POST /api/v1/conductor/location`
 * (auth:sanctum + role:CONDUCTOR + throttle:conductor-gps). The backend upserts
 * the row in `vehicle_locations` for the vehicle on the conductor's active shift
 * and fires the `VehicleLocationUpdated` broadcast — which is what makes the
 * conductor visible (and movable) on the commuter map.
 *
 * Capacity is intentionally not sent here (GPS-only updates), so it is left to
 * the backend default / whatever the conductor last set.
 */
export async function POST(request: NextRequest) {
  let body: {
    lat?: unknown;
    lng?: unknown;
    speed?: unknown;
    heading?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const { lat, lng, speed, heading } = body;

  if (!Number.isFinite(lat as number) || !Number.isFinite(lng as number)) {
    return jsonError("lat and lng are required.", 422);
  }

  const result = await proxyToLaravel(request, "/conductor/location", {
    method: "POST",
    body: {
      lat,
      lng,
      speed: Number.isFinite(speed as number) ? speed : null,
      heading: Number.isFinite(heading as number) ? heading : null,
    },
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Unable to update location.", result.status);
  }

  return jsonData(result.data);
}
