import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/conductor/earnings?shift_id={id}
 *
 * Proxies to Laravel GET /api/v1/conductor/earnings?shift_id={id}.
 * Laravel's TransactionService::getShiftEarnings() computes the
 * cash-vs-GCash split from the transactions table (only PAID rows count):
 *   - cash_total:  sum of CASH+PAID (the physically-remitted figure)
 *   - gcash_total: sum of GCASH+PAID (record-only, NOT remitted)
 *   - total:       cash_total + gcash_total
 *
 * PENDING GCash is EXCLUDED (it may still FAIL).
 */
export async function GET(request: NextRequest) {
  const shiftId = request.nextUrl.searchParams.get("shift_id");

  if (!shiftId) {
    return jsonError("shift_id query parameter is required.");
  }

  const result = await proxyToLaravel(
    request,
    `/conductor/earnings?shift_id=${encodeURIComponent(shiftId)}`,
    { method: "GET" }
  );

  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load earnings.", result.status);
  }

  // Laravel returns the earnings object directly in the data field:
  // { success: true, data: { cash_total, gcash_total, total }, message: "..." }
  return jsonData(result.data);
}
