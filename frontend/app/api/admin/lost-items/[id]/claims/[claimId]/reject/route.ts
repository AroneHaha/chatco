import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PATCH /api/admin/lost-items/{itemId}/claims/{claimId}/reject
 *
 * Sprint 6 (S6-T8) — admin rejects a PENDING or APPROVED claim.
 *
 * Forwards an optional { rejection_reason } body (max 1000 chars). The
 * backend records the reason for the audit trail so the commuter can
 * understand why their claim was denied. On rejecting the last pending
 * claim, the item may revert to AVAILABLE.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  const { id, claimId } = await params;
  if (!id || id === "undefined") return jsonError("Item ID is required.", 400);
  if (!claimId || claimId === "undefined") return jsonError("Claim ID is required.", 400);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // body optional (rejection_reason is nullable)
  }

  const result = await proxyToLaravel(
    request,
    `/admin/lost-items/${id}/claims/${claimId}/reject`,
    { method: "PATCH", body }
  );

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to reject claim.", result.status);
  }
  return jsonData(result.data);
}
