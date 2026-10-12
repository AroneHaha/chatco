import { NextRequest, NextResponse } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/payments/{id}/redeem-voucher
 *
 * Covers the commuter's own portion of an already-claimed, still-PENDING
 * GCash transaction with one of their available vouchers. Proxies straight
 * through to Laravel POST /api/v1/commuter/payments/{id}/redeem-voucher — no
 * payment amount is supplied by the client. An optional voucher id keeps the
 * chosen voucher consistent with the offer shown to the commuter. The Laravel envelope
 * (incl. 403/404/409/422/502 cases) is passed through verbatim.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    const parsed = text ? JSON.parse(text) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
    body = parsed;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }
  return proxyToLaravel(request, `${API_V1}/commuter/payments/${encodeURIComponent(id)}/redeem-voucher`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
