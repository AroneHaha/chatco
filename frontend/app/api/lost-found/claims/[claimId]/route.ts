import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * DELETE /api/lost-found/claims/{claimId}
 *
 * Commuter withdraws their own PENDING claim. Proxies to Laravel
 * DELETE /api/v1/lost-found/claims/{claimId} (role:COMMUTER).
 *   200 — cancelled (claim row deleted; item reverts to AVAILABLE when it
 *         was the last pending claim)
 *   404 — claim not found / not owned by this commuter
 *   422 — claim is not PENDING (already reviewed)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  const { claimId } = await params;
  if (!claimId || claimId === "undefined") {
    return new Response(JSON.stringify({ message: "Claim ID is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return proxyToLaravel(request, `${API_V1}/lost-found/claims/${claimId}`, { method: "DELETE" });
}
