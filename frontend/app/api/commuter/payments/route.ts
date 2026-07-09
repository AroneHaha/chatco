import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/commuter/payments
 *
 * Proxies to Laravel GET /api/v1/commuter/payments, forwarding pagination
 * query params (page, per_page). Returns the Laravel paginated envelope
 * verbatim (cookie auth via chatco_session).
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search; // e.g. "?page=1&per_page=20"
  return proxyToLaravel(request, `${API_V1}/commuter/payments${qs}`, {
    method: "GET",
  });
}
