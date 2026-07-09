import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PATCH /api/admin/sos/{id}/acknowledge
 *
 * Sprint 6 (S6-T10) — admin acknowledges an active SOS alert.
 *
 * Forwards to Laravel PATCH /api/v1/admin/sos/{id}/acknowledge, which flips
 * status ACTIVE → ACKNOWLEDGED and stamps acknowledged_by/acknowledged_at.
 * Idempotent (acknowledging an already-ACKNOWLEDGED alert is a no-op).
 * Returns 422 if the alert is already RESOLVED.
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
    `/admin/sos/${encodeURIComponent(id)}/acknowledge`,
    { method: "PATCH" }
  );

  if (!result.ok) {
    return jsonError(
      result.message ?? "Failed to acknowledge SOS.",
      result.status
    );
  }
  return jsonData(result.data);
}
