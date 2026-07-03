import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapShiftLog } from "@/lib/conductor/server/mappers";

/**
 * GET /api/conductor/shifts/active
 *
 * Proxies to Laravel `GET /api/v1/conductor/shift` (role:CONDUCTOR).
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/shift");

  if (result.ok) {
    if (!result.data) return jsonData(null);
    const shift = mapShiftLog(result.data);
    return jsonData(shift);
  }

  return jsonError(result.message ?? "Unable to check active shift.", result.status);
}
