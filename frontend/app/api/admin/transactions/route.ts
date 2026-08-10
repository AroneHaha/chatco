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
  // Forward both supported params. per_page used to be dropped here while the
  // client asked for 500, so Laravel fell back to its default of 100 and the
  // admin silently saw only the 100 most recent transactions — along with
  // summary tallies computed over that truncated slice.
  const params = new URLSearchParams();
  const shiftId = request.nextUrl.searchParams.get("shift_id");
  const perPage = request.nextUrl.searchParams.get("per_page");
  const date = request.nextUrl.searchParams.get("date");
  const dateFrom = request.nextUrl.searchParams.get("date_from");
  const dateTo = request.nextUrl.searchParams.get("date_to");
  if (shiftId) params.set("shift_id", shiftId);
  if (perPage) params.set("per_page", perPage);
  if (date) params.set("date", date);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);

  const query = params.toString();
  const path = query ? `/admin/transactions?${query}` : "/admin/transactions";

  const result = await proxyToLaravel(request, path, {
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
