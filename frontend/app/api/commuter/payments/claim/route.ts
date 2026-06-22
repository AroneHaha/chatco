import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/payments/claim
 *
 * The commuter scans the conductor's binding QR and claims the GCash
 * transaction. Proxies { qr_token } to Laravel POST /api/v1/commuter/payments/claim.
 * The Laravel envelope (incl. 404/409/410 cases) is passed through verbatim.
 */
export async function POST(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/payments/claim`, {
    method: "POST",
    body: await request.text(),
  });
}
