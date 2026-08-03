import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/commuter/claims
 *
 * The commuter's own lost-item claims (paginated, item eager-loaded), newest
 * first. Proxies to Laravel GET /api/v1/commuter/claims and forwards
 * page/per_page/status query params for the "My Claims" tab.
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  return proxyToLaravel(request, `${API_V1}/commuter/claims${qs}`, { method: "GET" });
}
