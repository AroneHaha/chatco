import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/activity-logs/export — every entry matching the filters
 * (category, search, date, date_range, actor_role), capped server-side, for
 * the page's PDF / Excel / Word export.
 *
 * Forwards to Laravel GET /api/v1/admin/activity-logs/export. Role:ADMIN
 * enforced at the Laravel /admin route group.
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  const result = await proxyToLaravel(request, `/admin/activity-logs/export${qs}`, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to export activity logs.", result.status);
  return jsonData(result.data);
}
