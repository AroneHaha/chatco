import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { API_V1, proxyToLaravel } from "@/lib/commuter/server/proxy";

/**
 * DELETE /api/commuter/hail/[id]
 *
 * Proxies to Laravel `DELETE /api/v1/commuter/hail/{id}` (guarded by
 * `auth:sanctum` + `role:COMMUTER` + `throttle:commuter-hail`).
 *
 * Laravel's HailService enforces ownership (403) and pending status (422);
 * on success it returns the cancelled hail (200, ApiResponse envelope).
 * The commuter proxy (S3-T9) forwards status + body verbatim — including a
 * 401 when the `chatco_session` cookie is missing.
 *
 * Next.js 16 delivers dynamic segments as a Promise on the route context, so
 * `ctx.params` must be awaited. The inline `{ params: Promise<{ id: string }> }`
 * type is structurally identical to the generated `RouteContext<...>` helper
 * but does not depend on typegen having already registered this new route.
 */
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (!id || id.trim() === "") {
    return NextResponse.json({ message: "Hail id is required." }, { status: 400 });
  }

  // No request body on DELETE — the proxy omits Content-Type so Laravel does
  // not 411 on a zero-length body.
  return proxyToLaravel(request, `${API_V1}/commuter/hail/${id}`, {
    method: "DELETE",
  });
}
