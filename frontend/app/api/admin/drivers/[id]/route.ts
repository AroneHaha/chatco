import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/drivers/{id}
 * Returns a single driver with full details for the profile modal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Driver ID is missing.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/drivers/${id}`, {
    method: "GET",
  });

  if (!result.ok) return jsonError(result.message ?? "Failed to load driver.", result.status);
  return jsonData(result.data);
}

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

/**
 * DELETE /api/admin/drivers/{id}
 * Soft-deletes a driver AND records the termination in the
 * terminated_personnel table. The backend rejects (409) if the driver is
 * currently on an active shift — the admin must end the shift first.
 *
 * Body (JSON):
 *   - reason: string (required) — why the driver is being removed
 *   - termination_type: 'TERMINATED' | 'RESIGNED' (required)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Driver ID is missing.", 400);
  }

  // Parse the body — the Fleet Management "Remove Personnel" modal sends
  // reason + termination_type so the backend can persist them in
  // terminated_personnel before soft-deleting the driver.
  let body: { reason?: string; termination_type?: string } | undefined;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  const result = await proxyToLaravel(request, `/admin/drivers/${id}`, {
    method: "DELETE",
    body,
  });

  if (!result.ok) {
    // 409 = driver is on an active shift; surface the conflict message.
    // 422 = validation error (missing reason / bad termination_type).
    if (result.status === 409) {
      const conflictMsg =
        result.errors?.driver?.[0] ??
        result.message ??
        "Cannot remove this driver — they may be on an active shift.";
      return jsonError(conflictMsg, 409);
    }
    if (result.status === 422) {
      return jsonValidationError(
        result.message ?? "Validation failed.",
        result.errors,
        422
      );
    }
    return jsonError(result.message ?? "Failed to remove driver.", result.status);
  }
  return jsonData(result.data);
}
