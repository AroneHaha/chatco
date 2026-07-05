import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/feedback?conductor_id={uuid}&per_page=&page=
 * GET /api/admin/feedback?driver_id={uuid}&per_page=&page=
 *
 * Sprint 6 (T6 revised) — Admin staff-feedback listing.
 *
 * Replaces the standalone admin "Feedback QR" module. The admin views
 * driver/conductor feedback from User Management by double-clicking a row.
 * The query string is forwarded verbatim to Laravel — the backend requires
 * ONE of conductor_id / driver_id (422 if neither) and returns paginated
 * feedback + a summary (average_rating, total_count, 5→1 distribution).
 */
export async function GET(request: NextRequest) {
  // Preserve the query string — pass conductor_id/driver_id/per_page/page through.
  const search = request.nextUrl.search;
  const path = `/admin/feedback${search}`;

  const result = await proxyToLaravel(request, path, { method: "GET" });
  if (result.ok) {
    return jsonData(result.data);
  }

  return jsonError(result.message ?? "Failed to load feedback.", result.status);
}
