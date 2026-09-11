import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/conductors/{id}/shift-logs
 * Proxies to Laravel GET /api/v1/admin/conductors/{id}/shift-logs.
 * Paginated (?page=, ?per_page=) — powers the conductor detail modal's
 * infinite-scroll "Assignment History" tab.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Conductor ID is missing.", 400);
  }

  const result = await proxyToLaravel(
    request,
    `/admin/conductors/${id}/shift-logs${request.nextUrl.search}`,
    { method: "GET" }
  );

  if (!result.ok) return jsonError(result.message ?? "Failed to load shift history.", result.status);
  return jsonData(result.data);
}
