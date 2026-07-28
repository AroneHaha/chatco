import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError, jsonValidationError } from "@/lib/conductor/server/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return jsonError("Invalid request body.", 400);

  const result = await proxyToLaravel(request, `/admin/users/${id}/suspend`, {
    method: "POST",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Suspension validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to suspend account.", result.status);
  }

  return jsonData(result.data);
}
