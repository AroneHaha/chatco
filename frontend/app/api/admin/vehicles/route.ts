import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/vehicles
 * POST /api/admin/vehicles
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/vehicles", { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load vehicles.", result.status);
  return jsonData(result.data);
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

  if (!result.ok) return jsonError(result.message ?? "Failed to create vehicle.", result.status);
  return jsonData(result.data, 201);
}

/**
 * DELETE /api/admin/vehicles/{id}
 * Note: This is handled via a dynamic route file: [id]/route.ts
 */
