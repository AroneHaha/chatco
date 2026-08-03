import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/monitoring/demand-zones", { method: "GET" });
  if (!result.ok) {
    return jsonError(result.message ?? "Failed to load demand zones.", result.status);
  }
  return jsonData(result.data);
}
