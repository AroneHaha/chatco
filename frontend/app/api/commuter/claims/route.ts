import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/commuter/claims
 *
 * The commuter's own lost-item claims (item eager-loaded), newest first.
 * Proxies to Laravel GET /api/v1/commuter/claims. Powers the "My Claims"
 * tab + per-card claim badges so claim state persists in the DB.
 */
export async function GET(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/claims`, { method: "GET" });
}
