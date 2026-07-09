import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PATCH /api/admin/lost-items/{itemId}/claims/{claimId}/release
 *
 * Sprint 6 (S6-T8) — admin releases an APPROVED claim (records handover).
 *
 * The backend sets the item → RELEASED with released_to + released_at. After
 * release, the admin may close the item (PATCH /admin/lost-items/{id}/close)
 * to finalize. No request body required.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 * 422 if the claim is not APPROVED.
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
    `/admin/lost-items/${id}/claims/${claimId}/release`,
    { method: "PATCH" }
  );

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to release claim.", result.status);
  }
  return jsonData(result.data);
}
