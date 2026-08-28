import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/activity-logs — paginated, server-filtered admin audit trail.
 *
 * Forwards filter query params (category, search, date, date_range, per_page,
 * page) to Laravel GET /api/v1/admin/activity-logs. Read-only — rows are
 * written server-side by ActivityLogService::record() from every other admin
 * endpoint, never through this route.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  const result = await proxyToLaravel(request, `/admin/activity-logs${qs}`, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load activity logs.", result.status);
  return jsonData(result.data);
}
