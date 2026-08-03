import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

export async function GET(request: NextRequest) {
  const query = new URL(request.url).search;
  const result = await proxyToLaravel(request, `/commuter/trips${query}`, { method: "GET" });
  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load trip history.", result.status);
  }
  return jsonData(result.data);
}
