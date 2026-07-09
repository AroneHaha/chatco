import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/admin/registrations/{id}/approve
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return jsonError("Registration ID is missing.", 400);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional for approve (admin_note is nullable)
  }

  const result = await proxyToLaravel(request, `/admin/registrations/${id}/approve`, {
    method: "POST",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to approve registration.", result.status);
  }
  return jsonData(result.data);
}
