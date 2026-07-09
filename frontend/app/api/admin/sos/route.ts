import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/sos?status=ACTIVE|ACKNOWLEDGED|RESOLVED|ALL&per_page=100
 *
 * Sprint 6 (S6-T10) — admin live SOS feed.
 *
 * Forwards query params to Laravel GET /api/v1/admin/sos, which returns a
 * paginated list of SosAlerts (newest first) with the `commuter` relation
 * eager-loaded. The admin monitoring page polls this every 5s.
 *
 * Status filter semantics (owned by the Laravel controller):
 *   - omitted         → defaults to ACTIVE (live dashboard feed)
 *   - status=ALL      → returns EVERY status
 *   - status=RESOLVED → RESOLVED only (used for the SOS History panel)
 *
 * The Laravel response is a paginator { data: [...], links, meta }. We
 * extract the items array so the frontend receives a flat { data: [...] }.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  const result = await proxyToLaravel(request, `/admin/sos${qs}`, {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(
      result.message ?? "Failed to load SOS alerts.",
      result.status
    );
  }

  // Laravel paginator → extract the items array. If the backend ever
  // returns a plain array (non-paginated), pass it through directly.
  const items: unknown[] = Array.isArray(result.data)
    ? result.data
    : Array.isArray((result.data as { data?: unknown[] })?.data)
    ? (result.data as { data: unknown[] }).data
    : [];

  return jsonData(items);
}
