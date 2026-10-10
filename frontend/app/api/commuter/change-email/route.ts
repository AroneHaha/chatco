import type { NextRequest } from "next/server";
import { proxyToLaravel, API_V1 } from "@/lib/commuter/server/proxy";

export async function GET(request: NextRequest) {
  const response = await proxyToLaravel(request, `${API_V1}/commuter/change-email`);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
