import { NextRequest } from "next/server";
import { jsonData, jsonError, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { haversineMeters } from "@/lib/utils/geo";

type Coordinate = [number, number];

interface OsrmResponse {
  code?: string;
  message?: string;
  routes?: Array<{
    geometry?: { type?: string; coordinates?: Array<[number, number]> };
    legs?: Array<{ distance?: number }>;
  }>;
  waypoints?: Array<{
    distance?: number;
    location?: [number, number];
  }>;
}

export async function POST(request: NextRequest) {
  // Reuse the authenticated admin backend request before using the external
  // road router. This keeps the preview endpoint unavailable to anonymous use.
  const authorization = await proxyToLaravel(request, "/admin/routes", { method: "GET" });
  if (!authorization.ok) return jsonError("Unauthorized.", authorization.status);

  let body: { waypoints?: unknown };
  try { body = await request.json(); } catch { return jsonError("Invalid request body.", 400); }

  if (!Array.isArray(body.waypoints) || body.waypoints.length < 2 || body.waypoints.length > 100) {
    return jsonValidationError("Use between 2 and 100 ordered route points.", {}, 422);
  }

  const waypoints: Coordinate[] = [];
  for (const coordinate of body.waypoints) {
    if (!Array.isArray(coordinate) || coordinate.length !== 2) {
      return jsonValidationError("Every route point must contain latitude and longitude.", {}, 422);
    }
    const latitude = Number(coordinate[0]);
    const longitude = Number(coordinate[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return jsonValidationError("A route point contains invalid coordinates.", {}, 422);
    }
    waypoints.push([latitude, longitude]);
  }

  const coordinatePath = waypoints
    .map(([latitude, longitude]) => `${longitude},${latitude}`)
    .join(";");
  const routerBase = (process.env.ROUTING_API_URL || "https://router.project-osrm.org").replace(/\/$/, "");
  const radiuses = waypoints.map(() => "150").join(";");
  const routeUrl = `${routerBase}/route/v1/driving/${coordinatePath}`
    + `?overview=full&geometries=geojson&steps=false&alternatives=false&continue_straight=false&radiuses=${radiuses}`;

  try {
    const response = await fetch(routeUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
    const route = (await response.json()) as OsrmResponse;
    const geometry = route.routes?.[0]?.geometry;
    if (!response.ok || route.code !== "Ok" || geometry?.type !== "LineString") {
      return jsonError(route.message ?? "No drivable route was found for those points.", 422);
    }

    const farWaypointIndex = (route.waypoints ?? []).findIndex((waypoint) => Number(waypoint.distance ?? 0) > 100);
    if (farWaypointIndex >= 0) {
      return jsonError(
        `Point ${farWaypointIndex + 1} is too far from a mapped road. Move it directly onto the intended street.`,
        422
      );
    }

    const badLegIndex = (route.routes?.[0]?.legs ?? []).findIndex((leg, index) => {
      const directDistance = haversineMeters(
        waypoints[index][0],
        waypoints[index][1],
        waypoints[index + 1][0],
        waypoints[index + 1][1]
      );
      const roadDistance = Number(leg.distance ?? 0);
      return directDistance > 30
        && roadDistance > 750
        && roadDistance / directDistance > 4;
    });
    if (badLegIndex >= 0) {
      return jsonError(
        `The road router created a large detour between points ${badLegIndex + 1} and ${badLegIndex + 2}. Move or remove one of those control points.`,
        422
      );
    }

    const coordinates = (geometry.coordinates ?? [])
      .filter((coordinate) => Array.isArray(coordinate)
        && Number.isFinite(Number(coordinate[0]))
        && Number.isFinite(Number(coordinate[1])))
      .map(([longitude, latitude]) => [latitude, longitude] as Coordinate);

    const snappedWaypoints = (route.waypoints ?? []).map((waypoint, index) => {
      const location = waypoint.location;
      return location && Number.isFinite(location[0]) && Number.isFinite(location[1])
        ? [location[1], location[0]] as Coordinate
        : waypoints[index];
    });

    if (coordinates.length < 2) return jsonError("The road router returned an empty route.", 422);
    return jsonData({ geometry: coordinates, snapped_waypoints: snappedWaypoints });
  } catch {
    return jsonError("The road routing service is temporarily unavailable.", 502);
  }
}
