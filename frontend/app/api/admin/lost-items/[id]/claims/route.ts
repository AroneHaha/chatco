import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/lost-items/{itemId}/claims
 *
 * Sprint 6 (S6-T8) — list all claims for a lost item (admin view).
 *
 * Returns claims with claimant info (admin-only field — commuters never see
 * other commuters' claim details). Used by the admin Claims modal when
 * reviewing pending claims to approve/reject/release.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return jsonError("Item ID is required.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/lost-items/${id}/claims`, {
    method: "GET",
  });
  if (!result.ok) return jsonError(result.message ?? "Failed to load claims.", result.status);
  return jsonData(result.data);
}
