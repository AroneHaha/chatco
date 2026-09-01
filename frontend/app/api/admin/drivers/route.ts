import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/drivers
 * POST /api/admin/drivers
 */
export async function GET(request: NextRequest) {
  const result = await proxyToLaravel(request, `/admin/drivers${request.nextUrl.search}`, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load drivers.", result.status);
  return jsonData(result.data);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> | FormData;
  try {
    body = request.headers.get("content-type")?.includes("multipart/form-data")
      ? await request.formData()
      : await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, "/admin/drivers", {
    method: "POST",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(
        result.message ?? "Validation failed.",
        result.errors,
        422
      );
    }
    return jsonError(result.message ?? "Failed to create driver.", result.status);
  }
  return jsonData(result.data, 201);
}
