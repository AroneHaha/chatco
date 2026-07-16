import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/registrations/rejected
 *
 * Lists REJECTED commuter accounts (soft-deleted, email rewritten).
 * Powers the Rejected tab in User Management.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/registrations/rejected", {
    method: "GET",
  });
  if (!result.ok) return jsonError(result.message ?? "Failed to load rejected registrations.", result.status);
  return jsonData(result.data);
}
