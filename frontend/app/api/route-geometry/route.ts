import { jsonData, jsonError } from "@/lib/conductor/server/response";

interface FareMatrixPoint {
  pointNumber: number;
  latitude: number | null;
  longitude: number | null;
}

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
  const apiUrl = process.env.API_URL || "http://localhost:8000";
  const routingApiUrl = (process.env.ROUTING_API_URL || "https://router.project-osrm.org")
    .replace(/\/$/, "");

  try {
    const fareResponse = await fetch(`${apiUrl}/api/v1/fare-matrix`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!fareResponse.ok) {
      return jsonError("Failed to load route coordinates.", fareResponse.status);
    }

    const fareBody = await fareResponse.json();
    const points = (fareBody.data?.points ?? []) as FareMatrixPoint[];
    const waypoints = points
      .filter(
        (point) =>
          point.latitude !== null &&
          point.longitude !== null &&
          Number.isFinite(Number(point.latitude)) &&
          Number.isFinite(Number(point.longitude))
      )
      .sort((a, b) => a.pointNumber - b.pointNumber)
      .map((point) => [Number(point.latitude), Number(point.longitude)] as RouteCoordinate)
      .filter(
        (coordinate, index, all) =>
          index === 0 ||
          coordinate[0] !== all[index - 1][0] ||
          coordinate[1] !== all[index - 1][1]
      );

    if (waypoints.length < 2) {
      return jsonError("At least two Fare Matrix coordinates are required.", 422);
    }

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
          return jsonData({ coordinates, source: "road-router" });
        }
      }
    }

    return jsonData({ coordinates: waypoints, source: "fare-points-fallback" });
  } catch {
    return jsonError("Unable to generate route geometry.", 502);
  }
}
