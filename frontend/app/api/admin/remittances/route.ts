import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/remittances
 *
 * Proxies to Laravel GET /api/v1/admin/remittances.
 * Returns all remittances across all shifts (ordered by date desc).
 *
 * Uses the conductor proxy because the admin routes share the same
 * Sanctum auth model (chatco_session cookie -> Bearer token).
 * The role:ADMIN middleware on the Laravel side enforces that only
 * admins can access this endpoint.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, `/admin/remittances${new URL(request.url).search}`, {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(
      result.message ?? "Failed to load remittances.",
      result.status
    );
  }

  return jsonData(result.data);
}
