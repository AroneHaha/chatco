import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST   /api/lost-found/{itemId}/watchlist — add to the commuter's watchlist
 * DELETE /api/lost-found/{itemId}/watchlist — remove from the watchlist
 *
 * Proxies to the Laravel watchlist endpoints (role:COMMUTER). Both are
 * idempotent on the backend: POST returns 201 when newly added / 200 when
 * already watching; DELETE returns 200 either way.
 */
export async function POST(
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
  return proxyToLaravel(request, `${API_V1}/lost-found/${id}/watchlist`, { method: "POST" });
}

export async function DELETE(
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
  return proxyToLaravel(request, `${API_V1}/lost-found/${id}/watchlist`, { method: "DELETE" });
}
