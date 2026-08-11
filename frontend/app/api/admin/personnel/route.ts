import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/personnel
 *
 * Proxies to Laravel's paginated Fleet Management personnel view, which
 * combines drivers and conductors without loading both full tables.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, `/admin/personnel${request.nextUrl.search}`, {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load personnel.", result.status);
  }

  return jsonData(result.data);
}
