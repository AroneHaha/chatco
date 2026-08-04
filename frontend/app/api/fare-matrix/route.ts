import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

/**
 * GET /api/fare-matrix
 *
 * Public endpoint — no auth required (fare info is public like a bus schedule).
 * Proxies to Laravel GET /api/v1/fare-matrix, which returns all fare points
 * ordered by point_number + the fare config constants (base zone, base fares,
 * succeeding increments) from the settings table.
 *
 * This is the SINGLE SOURCE OF TRUTH for fare calculation. The conductor's
 * FareCalcModal and the commuter's fare-calculator both consume this endpoint.
 * The admin's /settings/fare-matrix page edits the fare_points table; changes
 * are immediately visible to all consumers on their next fetch.
 */
export async function GET(request: NextRequest) {
  const API_URL = process.env.API_URL || "http://localhost:8000";
  const API_V1 = "/api/v1";
  const routeId = request.nextUrl.searchParams.get("route_id");
  const query = routeId ? `?route_id=${encodeURIComponent(routeId)}` : "";

  try {
    const res = await fetch(`${API_URL}${API_V1}/fare-matrix${query}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return jsonError("Failed to load fare matrix.", res.status);
    }

    const body = await res.json();
    return jsonData(body.data ?? null);
  } catch {
    return jsonError("Unable to reach the backend service.", 502);
  }
}
