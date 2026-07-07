import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/fare-points?route_id={uuid}
 * POST /api/admin/fare-points
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const routeId = url.searchParams.get("route_id");
  let laravelPath = "/admin/fare-points";
  if (routeId) laravelPath += `?route_id=${routeId}`;

  const result = await proxyToLaravel(request, laravelPath, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load fare points.", result.status);
  return jsonData(result.data);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, "/admin/fare-points", {
    method: "POST",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to create fare point.", result.status);
  }
  return jsonData(result.data, 201);
}
