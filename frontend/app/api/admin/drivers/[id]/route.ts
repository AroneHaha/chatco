import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * PUT/PATCH /api/admin/drivers/{id}
 * Proxies to Laravel PUT/PATCH /api/v1/admin/drivers/{id}.
 *
 * Body must contain: first_name, last_name, birthday, contact, license_number.
 * Optional: middle_name, profile_picture_url.
 *
 * NOTE: In Next.js 16, `params` is a Promise and must be awaited before
 * accessing its properties.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Driver ID is missing. Please close and reopen the modal.", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/drivers/${id}`, {
    method: "PUT",
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
    return jsonError(result.message ?? "Failed to update driver.", result.status);
  }
  return jsonData(result.data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Driver ID is missing. Please close and reopen the modal.", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/drivers/${id}`, {
    method: "PATCH",
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
    return jsonError(result.message ?? "Failed to update driver.", result.status);
  }
  return jsonData(result.data);
}
