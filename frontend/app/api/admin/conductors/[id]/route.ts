import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/conductors/{id}
 * Returns a single conductor with full details for the profile modal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Conductor ID is missing.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/conductors/${id}`, {
    method: "GET",
  });

  if (!result.ok) return jsonError(result.message ?? "Failed to load conductor.", result.status);
  return jsonData(result.data);
}
