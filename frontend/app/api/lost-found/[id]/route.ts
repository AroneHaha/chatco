import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * GET /api/lost-found/{itemId}
 *
 * Sprint 6 (S6-T8) — single lost item detail (any auth role).
 *
 * Proxies to Laravel GET /api/v1/lost-found/{itemId}. Backs the shared
 * service's show(id); 404 when the item doesn't exist.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return new Response(JSON.stringify({ message: "Item ID is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return proxyToLaravel(request, `${API_V1}/lost-found/${id}`, { method: "GET" });
}
