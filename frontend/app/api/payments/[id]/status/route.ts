import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/payments/{id}/status
 *
 * Role-agnostic status poll (conductor or commuter — both carry the
 * chatco_session cookie). Proxies to Laravel GET /api/v1/payments/{id}/status,
 * which authorizes to the shift's conductor or the bound commuter only.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  return proxyToLaravel(
    request,
    `${API_V1}/payments/${encodeURIComponent(id)}/status`,
    { method: "GET" }
  );
}
