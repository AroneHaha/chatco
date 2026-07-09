import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/settings?category=financial
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const laravelPath = category
    ? `/admin/settings?category=${encodeURIComponent(category)}`
    : "/admin/settings";

  const result = await proxyToLaravel(request, laravelPath, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load settings.", result.status);
  return jsonData(result.data);
}
