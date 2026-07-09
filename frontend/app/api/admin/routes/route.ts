import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, "/admin/routes", { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load routes.", result.status);
  return jsonData(result.data);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("Invalid request body.", 400); }

  const result = await proxyToLaravel(request, "/admin/routes", { method: "POST", body });
  if (!result.ok) {
    if (result.status === 422) return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    return jsonError(result.message ?? "Failed to create route.", result.status);
  }
  return jsonData(result.data, 201);
}
