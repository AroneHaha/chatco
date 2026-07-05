import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/conductor/sos/{id}
 *
 * Conductor polls their own SOS alert status. Forwards to Laravel
 * GET /api/v1/conductor/sos/{id}, which is scoped to the auth conductor's
 * profile in SosService::findForConductor(). The conductor SOS modal polls
 * this every 3s to detect when the admin acknowledges / resolves the alert so
 * the UI can flip to "responded".
 *
 * Role:CONDUCTOR enforced at the Laravel /conductor route group.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await proxyToLaravel(
    request,
    `/conductor/sos/${encodeURIComponent(id)}`,
    { method: "GET" }
  );

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load SOS alert.", result.status);
  }
  return jsonData(result.data);
}
