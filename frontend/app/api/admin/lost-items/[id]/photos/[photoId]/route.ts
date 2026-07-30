import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * DELETE /api/admin/lost-items/{itemId}/photos/{photoId}
 *
 * Admin removes a photo from a lost item. The backend re-compacts the
 * remaining photos' positions and re-syncs lost_items.image_url to whatever
 * now sits at position 0 (null if none left).
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id, photoId } = await params;
  if (!id || id === "undefined") return jsonError("Item ID is required.", 400);
  if (!photoId || photoId === "undefined") return jsonError("Photo ID is required.", 400);

  const result = await proxyToLaravel(request, `/admin/lost-items/${id}/photos/${photoId}`, {
    method: "DELETE",
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to remove photo.", result.status);
  }
  return jsonData(result.data);
}
