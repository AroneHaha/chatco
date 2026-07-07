import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/commuter/watchlist
 *
 * The commuter's watchlisted lost items (paginated, item eager-loaded).
 * Proxies to Laravel GET /api/v1/commuter/watchlist, forwarding per_page/page.
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  return proxyToLaravel(request, `${API_V1}/commuter/watchlist${qs}`, { method: "GET" });
}
