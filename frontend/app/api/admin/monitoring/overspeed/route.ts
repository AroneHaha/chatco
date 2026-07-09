import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/monitoring/overspeed?threshold=60
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const threshold = url.searchParams.get("threshold") ?? "60";
  const result = await proxyToLaravel(request, `/admin/monitoring/overspeed?threshold=${threshold}`, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load overspeed data.", result.status);
  return jsonData(result.data);
}
