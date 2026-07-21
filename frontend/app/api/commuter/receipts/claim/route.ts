import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/receipts/claim
 *
 * Binds a paper cash receipt to the authenticated commuter. The body carries
 * the opaque qr_token printed on the receipt; the backend validates it is a
 * PAID cash ride inside the receipt TTL and not already claimed, then sets
 * passenger_id — which is what makes the ride count toward the reward cycle.
 */
export async function POST(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/receipts/claim`, {
    method: "POST",
    body: await request.text(),
  });
}
