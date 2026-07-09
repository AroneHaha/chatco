import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/conductor/payments/gcash/pending
 *
 * The conductor's resumable PENDING GCash transaction for their active
 * shift, or null. Proxies to Laravel GET /api/v1/conductor/payments/gcash/pending.
 *
 * Lets the fare modal re-display the SAME QR + details after the conductor
 * navigated away or refreshed mid-payment, instead of minting a duplicate.
 * The backend lazily expires stale rows, so a QR past its TTL is never
 * offered for resume.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/conductor/payments/gcash/pending", {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Unable to check pending GCash payment.", result.status);
  }

  return jsonData(result.data);
}
