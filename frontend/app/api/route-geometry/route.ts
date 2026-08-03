import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

export async function GET(request: NextRequest) {
  const apiUrl = process.env.API_URL || "http://localhost:8000";
  const routeId = request.nextUrl.searchParams.get("route_id");
  const query = routeId ? `?route_id=${encodeURIComponent(routeId)}` : "";

  try {
    const response = await fetch(`${apiUrl}/api/v1/routes/active${query}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return jsonError(body?.message ?? "No active route is published.", response.status);
    }

    return jsonData(body.data);
  } catch {
    return jsonError("Unable to reach the route service.", 502);
  }
}
