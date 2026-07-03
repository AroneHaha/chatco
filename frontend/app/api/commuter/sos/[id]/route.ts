import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/commuter/sos/{id}
 *
 * Sprint 6 (S6-T10) — commuter polls their own SOS alert status.
 *
 * Forwards to Laravel GET /api/v1/commuter/sos/{id}, which is scoped to the
 * auth commuter's profile in SosService::findForCommuter() — a commuter
 * cannot read another commuter's alert. Returns the alert with the `commuter`
 * relation loaded.
 *
 * The commuter modal polls this every 3s to detect when the admin
 * acknowledges / resolves the alert so the UI can flip to "responded".
 *
 * Role:COMMUTER enforced at the Laravel /commuter route group.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await proxyToLaravel(
    request,
    `/commuter/sos/${encodeURIComponent(id)}`,
    { method: "GET" }
  );

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load SOS alert.", result.status);
  }
  return jsonData(result.data);
}
