import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Route ID is missing.", 400);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return jsonError("Invalid request body.", 400); }

  const result = await proxyToLaravel(request, `/admin/routes/${id}`, { method: "PUT", body });
  if (!result.ok) {
    if (result.status === 422) return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    return jsonError(result.message ?? "Failed to update route.", result.status);
  }
  return jsonData(result.data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Route ID is missing.", 400);

  const result = await proxyToLaravel(request, `/admin/routes/${id}`, { method: "DELETE" });
  if (!result.ok) return jsonError(result.message ?? "Failed to delete route.", result.status);
  return jsonData(result.data);
}
