import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/monitoring/overspeed?threshold=60
 */
export async function GET(request: NextRequest) {
  const search = new URL(request.url).search;
  const result = await proxyToLaravel(request, `/admin/monitoring/overspeed${search}`, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load overspeed data.", result.status);
  return jsonData(result.data);
}
