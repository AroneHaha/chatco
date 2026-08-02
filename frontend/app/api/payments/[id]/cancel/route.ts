import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { API_V1 } from "@/lib/commuter/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

/**
 * POST /api/payments/{id}/cancel
 *
 * Cancels a PENDING GCash payment. Only the conductor of the shift that
 * owns the transaction can cancel it. The backend transitions the
 * transaction PENDING → CANCELLED through the state machine.
 *
 * Use case: the commuter didn't scan the QR in time, or changed their
 * mind. The conductor cancels instead of waiting for the 5-minute TTL.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const result = await proxyToLaravel(
    request,
    `${API_V1}/payments/${encodeURIComponent(id)}/cancel`,
    { method: "POST", body: await request.text() }
  );

  if (!result.ok) {
    return jsonError(
      result.message ?? "Failed to cancel payment.",
      result.status
    );
  }

  return jsonData(result.data ?? { status: "CANCELLED" });
}
