import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/routes", { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load routes.", result.status);
  return jsonData(result.data);
}
