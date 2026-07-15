import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/admin/conductors/{id}/disable
 *
 * Manually disables a conductor's account. Revokes all Sanctum tokens
 * (instant logout everywhere). Does NOT soft-delete or terminate —
 * useful for temporary suspensions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Conductor ID is missing.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/conductors/${id}/disable`, {
    method: "POST",
  });

  if (!result.ok) return jsonError(result.message ?? "Failed to disable conductor.", result.status);
  return jsonData(result.data);
}
