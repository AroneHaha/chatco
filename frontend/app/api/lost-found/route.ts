import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/lost-found
 *
 * Sprint 6 (S6-T8) — public browse of reported lost items.
 *
 * Proxies to Laravel GET /api/v1/lost-found, forwarding filter query params
 * (status, category, search, per_page, page) verbatim. Open to any auth role
 * (the backend route group is `auth:sanctum` only — no role restriction).
 * Returns the Laravel paginated envelope verbatim.
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  return proxyToLaravel(request, `${API_V1}/lost-found${qs}`, { method: "GET" });
}
