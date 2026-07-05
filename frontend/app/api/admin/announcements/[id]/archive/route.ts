import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PATCH /api/admin/announcements/{id}/archive
 *
 * Sprint 6 (S6-T9) — admin archives an announcement (status=ARCHIVED).
 *
 * The backend flips the announcement → ARCHIVED. Idempotent — archiving an
 * already-archived item is a no-op. No request body required. An archived
 * announcement disappears from the commuter bell + the user-facing feed, but
 * remains visible in the admin table (filter to ARCHIVED to see it).
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Announcement ID is required.", 400);

  const result = await proxyToLaravel(request, `/admin/announcements/${id}/archive`, {
    method: "PATCH",
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to archive announcement.", result.status);
  }
  return jsonData(result.data);
}
