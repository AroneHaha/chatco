import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/admin/conductors/{id}/reset-credentials
 *
 * Regenerates the conductor's username + password. The new credentials
 * are returned ONCE in the response so the admin can hand them to the
 * conductor. All existing Sanctum tokens are revoked.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Conductor ID is missing.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/conductors/${id}/reset-credentials`, {
    method: "POST",
  });

  if (!result.ok) return jsonError(result.message ?? "Failed to reset credentials.", result.status);
  return jsonData(result.data);
}
