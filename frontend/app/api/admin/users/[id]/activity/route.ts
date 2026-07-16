import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/users/{id}/activity
 *
 * Returns a chronological activity timeline for a user. Reuses existing
 * data sources (transactions, shift_logs, verification dates) instead of
 * a separate audit_logs table. Powers the User History modal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("User ID is missing.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/users/${id}/activity`, {
    method: "GET",
  });
  if (!result.ok) return jsonError(result.message ?? "Failed to load user activity.", result.status);
  return jsonData(result.data);
}
