import type { NextRequest } from "next/server";
import { API_V1, proxyToLaravel } from "@/lib/commuter/server/proxy";

export async function GET(request: NextRequest, { params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const response = await proxyToLaravel(request, `${API_V1}/commuter/vehicles/${encodeURIComponent(vehicleId)}/details`);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
