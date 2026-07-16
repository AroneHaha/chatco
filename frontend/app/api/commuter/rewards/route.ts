import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/commuter/rewards
 *
 * Returns the commuter's reward progress + earned vouchers.
 * The backend counts PAID non-voucher rides, computes the reward cycle
 * (every N rides = 1 free ride voucher), auto-generates missing vouchers,
 * and returns the full voucher list.
 */
export async function GET(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/rewards`, {
    method: "GET",
  });
}
