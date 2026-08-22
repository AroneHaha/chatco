import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { mapConductorHail } from "@/lib/conductor/server/mappers";

/**
 * POST /api/conductor/hails/[id]/accept
 *
 * Proxies to Laravel `POST /api/v1/conductor/hails/{id}/accept` (guarded by
 * `auth:sanctum` + `role:CONDUCTOR` + `throttle:conductor-mutation`).
 *
 * Laravel's HailService enforces shift ownership (403), pending status (422),
 * and expiry (422). On success it returns the updated hail, which we map to
 * the frontend's `ConductorHailRequest` shape for consistency with the list.
 *
 * Next.js 16 delivers dynamic segments as a Promise on the route context, so
 * `ctx.params` must be awaited.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  if (!id || id.trim() === "") {
    return jsonError("Hail id is required.", 400);
  }

  const body = await request.json().catch(() => ({})) as {
    deviceId?: unknown;
    deviceType?: unknown;
  };

  const result = await proxyToLaravel(request, `/conductor/hails/${id}/accept`, {
    method: "POST",
    body: {
      device_id: typeof body.deviceId === "string" ? body.deviceId : undefined,
      device_type: body.deviceType === "WEB" || body.deviceType === "MOBILE" ? body.deviceType : undefined,
    },
  });

  if (!result.ok) {
    return jsonError(result.message ?? "Unable to accept hail.", result.status);
  }

  return jsonData(mapConductorHail(result.data));
}
