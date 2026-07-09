import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/lost-found/{itemId}/claim
 *
 * Sprint 6 (S6-T8) — commuter submits a claim with proof of ownership.
 *
 * Proxies to Laravel POST /api/v1/lost-found/{itemId}/claim, forwarding the
 * { proof, claimant_contact?, claimant_email? } body verbatim. The backend
 * derives claimant_name + claimant_id from the auth user's commuter profile
 * (never trusts client input for those), creates a PENDING claim, and flips
 * the item → CLAIMED if it was AVAILABLE.
 *
 * Role:COMMUTER is enforced at the Laravel route. Throttled at commuter-write.
 *
 * Response codes (passed through to the client service):
 *   201 — claim created (returns the Claim row)
 *   409 — item already CLAIMED/APPROVED/RELEASED/CLOSED (can't claim)
 *   422 — validation (proof missing/too long, etc.)
 *   403 — caller is not a COMMUTER
 *   401 — session expired
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return new Response(JSON.stringify({ message: "Item ID is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return proxyToLaravel(request, `${API_V1}/lost-found/${id}/claim`, {
    method: "POST",
    body: await request.text(),
  });
}
