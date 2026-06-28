import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/registrations
 * Lists PENDING commuter accounts awaiting admin review.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/registrations", { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load registrations.", result.status);
  return jsonData(result.data);
}
