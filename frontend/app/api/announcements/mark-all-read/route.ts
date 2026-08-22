import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/announcements/mark-all-read?types=claim_approved,claim_rejected
 *
 * Bulk mark-as-read for the current user. Forwards an optional `?types=`
 * (comma-separated) — omitted, marks every ACTIVE unread announcement;
 * scoped, marks only the matching rows (e.g. the Lost & Found Claims tab
 * marks just claim_approved/claim_rejected/claim_released as read when opened).
 *
 * Proxies to Laravel POST /api/v1/announcements/mark-all-read. No request body.
 * Open to any auth role.
 */
export async function POST(request: NextRequest) {
  const qs = request.nextUrl.search;
  return proxyToLaravel(request, `${API_V1}/announcements/mark-all-read${qs}`, {
    method: "POST",
  });
}
