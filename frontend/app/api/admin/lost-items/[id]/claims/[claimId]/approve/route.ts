import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PATCH /api/admin/lost-items/{itemId}/claims/{claimId}/approve
 *
 * Sprint 6 (S6-T8) — admin approves a PENDING claim.
 *
 * The backend flips the claim → APPROVED and the item → APPROVED (ready for
 * release). No request body required. After approval, the admin releases the
 * item (PATCH .../release) to record the handover.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 * 422 if the claim is not PENDING (already reviewed).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> }
) {
  const { id, claimId } = await params;
  if (!id || id === "undefined") return jsonError("Item ID is required.", 400);
  if (!claimId || claimId === "undefined") return jsonError("Claim ID is required.", 400);

  const result = await proxyToLaravel(
    request,
    `/admin/lost-items/${id}/claims/${claimId}/approve`,
    { method: "PATCH" }
  );

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to approve claim.", result.status);
  }
  return jsonData(result.data);
}
