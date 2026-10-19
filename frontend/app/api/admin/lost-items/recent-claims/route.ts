import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/** Recent claim rows with their matching item details for the dashboard. */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/lost-items/recent-claims", { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load recent claims.", result.status);
  return jsonData(result.data);
}
