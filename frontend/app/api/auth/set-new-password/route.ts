import type { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/commuter/server/proxy";

/**
 * POST /api/auth/set-new-password
 *
 * Replaces a system-generated default password. Forwards the chatco_session
 * token to Laravel POST /api/v1/auth/set-new-password, which revokes every
 * session when it succeeds.
 */
export async function POST(request: NextRequest) {
  return proxyToLaravel(request, "/api/v1/auth/set-new-password", {
    method: "POST",
    body: await request.text(),
  });
}
