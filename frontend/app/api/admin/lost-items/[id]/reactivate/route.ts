import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PATCH /api/admin/lost-items/{itemId}/reactivate
 *
 * Admin manually brings an auto-expired item back to AVAILABLE (e.g. a
 * claimant turns up after the archive window closed). No request body.
 * 422 if the item is not currently EXPIRED.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Item ID is required.", 400);

  const result = await proxyToLaravel(request, `/admin/lost-items/${id}/reactivate`, {
    method: "PATCH",
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to reactivate item.", result.status);
  }
  return jsonData(result.data);
}
