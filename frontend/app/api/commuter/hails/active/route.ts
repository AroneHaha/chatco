import type { NextRequest } from "next/server";
import { API_V1, proxyToLaravel } from "@/lib/commuter/server/proxy";

/**
 * GET /api/commuter/hails/active
 *
 * Proxies to Laravel `GET /api/v1/commuter/hails/active`: the commuter's
 * pending hail, or the one a unit accepted (until its 2-minute hold ends),
 * or null. The dashboard reads it once on open to restore that state after
 * the commuter visited another module.
 */
export async function GET(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/hails/active`, { method: "GET" });
}
