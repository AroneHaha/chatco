import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/payments/{id}/redeem-voucher
 *
 * Covers the commuter's own portion of an already-claimed, still-PENDING
 * GCash transaction with one of their available vouchers. Proxies straight
 * through to Laravel POST /api/v1/commuter/payments/{id}/redeem-voucher — no
 * body, the transaction id comes from the route param. The Laravel envelope
 * (incl. 403/404/409/422/502 cases) is passed through verbatim.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToLaravel(request, `${API_V1}/commuter/payments/${encodeURIComponent(id)}/redeem-voucher`, {
    method: "POST",
  });
}
