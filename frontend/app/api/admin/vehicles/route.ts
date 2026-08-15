import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/vehicles
 * POST /api/admin/vehicles
 *
 * Proxies to Laravel's admin vehicle endpoints.
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, `/admin/vehicles${request.nextUrl.search}`, { method: "GET" });
  if (result.ok) return jsonData(result.data);

  return jsonError(result.message ?? "Failed to load vehicles.", result.status);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, "/admin/vehicles", {
    method: "POST",
    body,
  });

  if (result.ok) {
    return jsonData(result.data, 201);
  }

  if (result.status === 422) {
    return jsonValidationError(
      result.message ?? "Validation failed.",
      result.errors,
      422
    );
  }
  return jsonError(result.message ?? "Failed to create vehicle.", result.status);
}
