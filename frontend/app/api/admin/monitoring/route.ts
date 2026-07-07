import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/monitoring
 * Proxies to Laravel GET /api/v1/admin/monitoring.
 * Returns the live fleet (vehicles with active shifts) with GPS positions,
 * capacity status, speed, and a `is_stale` flag (>10 min since last update).
 *
 * Designed for 5-second polling from the admin monitoring dashboard.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/monitoring", { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load monitoring data.", result.status);
  return jsonData(result.data);
}
