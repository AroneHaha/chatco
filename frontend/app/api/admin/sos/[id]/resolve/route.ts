import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PATCH /api/admin/sos/{id}/resolve
 *
 * Sprint 6 (S6-T10) — admin resolves an SOS alert (terminal state).
 *
 * Forwards to Laravel PATCH /api/v1/admin/sos/{id}/resolve, which flips any
 * non-RESOLVED status → RESOLVED and stamps resolved_by/resolved_at. If the
 * admin skipped acknowledge, acknowledged_by/at are auto-stamped too.
 * Returns 422 if already RESOLVED.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await proxyToLaravel(
    request,
    `/admin/sos/${encodeURIComponent(id)}/resolve`,
    { method: "PATCH" }
  );

  if (!result.ok) {
    return jsonError(
      result.message ?? "Failed to resolve SOS.",
      result.status
    );
  }
  return jsonData(result.data);
}
