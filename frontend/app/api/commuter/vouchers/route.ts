import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/commuter/vouchers?status=available|used|expired&cursor=
 *
 * One tab of the rewards page's voucher wallet, newest first and cursor
 * paginated for infinite scroll. Query params are forwarded verbatim.
 */
export async function GET(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/vouchers${request.nextUrl.search}`, {
    method: "GET",
  });
}
