import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PATCH /api/admin/lost-items/{itemId}
 *
 * Admin edits a previously reported item's descriptive fields (name,
 * description, plate/driver/conductor, category, estimated time, vehicle).
 * Forwards the body to Laravel PATCH /api/v1/admin/lost-items/{itemId}.
 * 422 if the item is CLOSED (a finalized historical record).
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Item ID is required.", 400);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/lost-items/${id}`, {
    method: "PATCH",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to update item.", result.status);
  }
  return jsonData(result.data);
}
