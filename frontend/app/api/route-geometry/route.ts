import { jsonData } from "@/lib/conductor/server/response";
import { ROUTE_COORDS } from "@/config/route-coords";

interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    geometry?: {
      type?: string;
      coordinates?: Array<[number, number]>;
    };
  }>;
}

type RouteCoordinate = [number, number];

export async function GET() {
  const routingApiUrl = (process.env.ROUTING_API_URL || "https://router.project-osrm.org")
    .replace(/\/$/, "");
  const waypoints = ROUTE_COORDS.filter(
    (coordinate, index, all) =>
      index === 0 ||
      coordinate[0] !== all[index - 1][0] ||
      coordinate[1] !== all[index - 1][1]
  );

  try {
    const osrmCoordinates = waypoints
      .map(([latitude, longitude]) => `${longitude},${latitude}`)
      .join(";");
    const routeUrl = `${routingApiUrl}/route/v1/driving/${osrmCoordinates}` +
      "?overview=full&geometries=geojson&steps=false&continue_straight=true";

    const routeResponse = await fetch(routeUrl, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (routeResponse.ok) {
      const routeBody = (await routeResponse.json()) as OsrmRouteResponse;
      const geometry = routeBody.routes?.[0]?.geometry;
      if (routeBody.code === "Ok" && geometry?.type === "LineString") {
        const coordinates = (geometry.coordinates ?? [])
          .filter(
            (coordinate) =>
              Array.isArray(coordinate) &&
              Number.isFinite(Number(coordinate[0])) &&
              Number.isFinite(Number(coordinate[1]))
          )
          .map(([longitude, latitude]) => [latitude, longitude] as RouteCoordinate);

        if (coordinates.length >= 2) {
          return jsonData({
            coordinates,
            source: "road-router",
            anchorSource: "hardcoded-route",
          });
        }
      }
    }

    return jsonData({
      coordinates: waypoints,
      source: "hardcoded-route-fallback",
      anchorSource: "hardcoded-route",
    });
  } catch {
    return jsonData({
      coordinates: waypoints,
      source: "hardcoded-route-fallback",
      anchorSource: "hardcoded-route",
    });
  }
}
