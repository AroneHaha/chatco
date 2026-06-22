import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/payments/{id}/simulate  (DEV ONLY)
 *
 * Drives a PENDING GCash payment to PAID/FAILED through the real backend
 * webhook/state-machine path, for demoing GCash before real PayMongo keys
 * exist. Laravel hard-disables this unless payments.allow_simulation is on.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return proxyToLaravel(
    request,
    `${API_V1}/payments/${encodeURIComponent(id)}/simulate`,
    { method: "POST", body: await request.text() }
  );
}
