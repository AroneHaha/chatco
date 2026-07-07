import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/announcements/unread-count
 *
 * Sprint 6 (S6-T9) — bell badge count for the current user.
 *
 * Proxies to Laravel GET /api/v1/announcements/unread-count, which returns
 * `{ success, data: { count: int }, ... }` — the count of ACTIVE announcements
 * the authenticated user has NOT yet read. Open to any auth role.
 *
 * Polled by the announcement bell on mount + every 30s.
 */
export async function GET(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/announcements/unread-count`, {
    method: "GET",
  });
}
