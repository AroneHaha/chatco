import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/announcements/{id}/read
 *
 * Sprint 6 (S6-T9) — mark an announcement as read for the current user.
 *
 * Proxies to Laravel POST /api/v1/announcements/{id}/read. The backend upserts
 * a row in `announcement_reads` (composite PK announcement_id + user_id) —
 * idempotent, re-reading just refreshes read_at. No request body required.
 *
 * Response codes (passed through to the client service):
 *   200 — marked as read (returns the standard envelope with data:null)
 *   404 — announcement not found (or archived — can't read an archived one)
 *   401 — session expired
 *
 * Open to any auth role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return new Response(JSON.stringify({ message: "Announcement ID is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return proxyToLaravel(request, `${API_V1}/announcements/${id}/read`, {
    method: "POST",
  });
}
