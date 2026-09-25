import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * POST /api/admin/conductors/{id}/disable
 *
 * Manually disables a conductor's account. Revokes all Sanctum tokens
 * (instant logout everywhere). Does NOT soft-delete or terminate —
 * useful for temporary suspensions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Conductor ID is missing.", 400);
  }

  let body: { current_password?: string } | undefined;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  const result = await proxyToLaravel(request, `/admin/conductors/${id}/disable`, {
    method: "POST",
    body,
  });

  // Pass the errors map through: it carries the specific reason ("The
  // password you entered is incorrect.", the active-shift conflict) under a
  // generic top-level message.
  if (!result.ok && (result.status === 422 || result.status === 409)) {
    return jsonValidationError(result.message ?? "Request failed.", result.errors, result.status);
  }
  if (!result.ok) return jsonError(result.message ?? "Failed to disable conductor.", result.status);
  return jsonData(result.data);
}
