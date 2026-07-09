import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PATCH /api/admin/lost-items/{itemId}/close
 *
 * Sprint 6 (S6-T8) — admin closes a RELEASED item (finalizes after handover).
 *
 * The backend flips the item → CLOSED and records closed_by + closed_at. No
 * request body required. A closed item is immutable (no further claims or
 * reviews).
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 * 422 if the item is not RELEASED.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Item ID is required.", 400);

  const result = await proxyToLaravel(request, `/admin/lost-items/${id}/close`, {
    method: "PATCH",
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to close item.", result.status);
  }
  return jsonData(result.data);
}
