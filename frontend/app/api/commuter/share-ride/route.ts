import { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

/**
 * POST /api/commuter/share-ride
 * Creates (or refreshes) a tracking link for the commuter.
 *
 * DELETE /api/commuter/share-ride
 * Deactivates the commuter's active share link.
 */
export async function POST(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/share-ride`, {
    method: "POST",
    body: await request.text(),
  });
}

export async function DELETE(request: NextRequest) {
  return proxyToLaravel(request, `${API_V1}/commuter/share-ride`, {
    method: "DELETE",
  });
}
