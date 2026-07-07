import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/analytics?date_from=&date_to=
 * Proxies to Laravel GET /api/v1/admin/analytics.
 *
 * Passes through date_from + date_to query params for range filtering.
 * Default window (if no params): last 30 days (enforced by the backend).
 *
 * Returns aggregated business metrics:
 *   - date_range: { from, to, days }
 *   - totals: { total_fares, cash_total, gcash_total, paid_count, pending_count, total_passengers }
 *   - payment_split: { cash: {count, total}, gcash: {count, total} }
 *   - daily_series: [{ date, cash, gcash, total, count }, ...]
 *   - remittances: { total_remitted, total_collected, total_shortage, count }
 *   - fleet: { active_vehicles, total_vehicles, active_conductors, total_conductors }
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");

  let laravelPath = "/admin/analytics";
  const params = new URLSearchParams();
  if (dateFrom) params.append("date_from", dateFrom);
  if (dateTo) params.append("date_to", dateTo);
  if (params.toString()) laravelPath += `?${params.toString()}`;

  const result = await proxyToLaravel(request, laravelPath, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load analytics.", result.status);
  return jsonData(result.data);
}
