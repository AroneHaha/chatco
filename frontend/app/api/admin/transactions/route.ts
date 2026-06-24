import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/transactions
 *
 * Proxies to Laravel GET /api/v1/admin/transactions.
 * Returns all transactions across all shifts (ordered by created_at desc).
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/transactions", {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(
      result.message ?? "Failed to load transactions.",
      result.status
    );
  }

  return jsonData(result.data);
}
