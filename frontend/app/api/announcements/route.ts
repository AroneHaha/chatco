import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/announcements
 *
 * Sprint 6 (S6-T9) — user-facing announcement feed (any authenticated role).
 *
 * Proxies to Laravel GET /api/v1/announcements, forwarding filter query params
 * (unread_only, per_page, page) verbatim. Open to any auth role (the backend
 * route group is `auth:sanctum` only — no role restriction). Returns the
 * Laravel paginated envelope verbatim, where each row carries an `is_read`
 * flag resolved per-authenticated-user via a leftJoin on announcement_reads.
 *
 * Used by:
 *   - The shared announcement bell (top 5 unread for the dropdown)
 *   - The commuter rewards "Latest Updates" panel
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  return proxyToLaravel(request, `${API_V1}/announcements${qs}`, { method: "GET" });
}
