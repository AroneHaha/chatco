import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/conductors/{id}
 * Returns a single conductor with full details for the profile modal:
 *   - Personal info (name, birthday, profile picture, generated username)
 *   - Current vehicle assignment + driver partner
 *   - Recent shift logs (assignment history, last 20)
 *
 * Backend: AdminController::showConductor (already exists).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Conductor ID is missing.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/conductors/${id}`, {
    method: "GET",
  });

  if (!result.ok) return jsonError(result.message ?? "Failed to load conductor.", result.status);
  return jsonData(result.data);
}

/**
 * PUT /api/admin/conductors/{id}
 * Updates a conductor's editable fields: first_name, middle_name, last_name,
 * birthday, profile_picture_url. The generated_username and generated_password
 * are NOT editable here (regenerate-credentials is a separate flow).
 *
 * Backend: AdminController::updateConductor.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Conductor ID is missing. Please close and reopen the modal.", 400);
  }

  let body: Record<string, unknown> | FormData;
  try {
    body = request.headers.get("content-type")?.includes("multipart/form-data")
      ? await request.formData()
      : await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/conductors/${id}`, {
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
    return jsonError(result.message ?? "Failed to update conductor.", result.status);
  }
  return jsonData(result.data);
}

/**
 * DELETE /api/admin/conductors/{id}
 *
 * Soft-deletes a conductor's user account AND records the termination in
 * the terminated_personnel table. This is SEPARATE from the generic
 * DELETE /admin/users/{id} — the Fleet Management "Remove Personnel" flow
 * captures a reason + termination_type that needs to be persisted.
 *
 * conductor_profile.id is the shared PK with users.id, so soft-deleting
 * the user cascades to the conductor profile.
 *
 * Body (JSON):
 *   - reason: string (required)
 *   - termination_type: 'TERMINATED' | 'RESIGNED' (required)
 *
 * The backend rejects (409) if the conductor is currently on an active
 * shift — the admin must end the shift first.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Conductor ID is missing.", 400);
  }

  let body: { reason?: string; termination_type?: string } | undefined;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  const result = await proxyToLaravel(request, `/admin/conductors/${id}`, {
    method: "DELETE",
    body,
  });

  if (!result.ok) {
    if (result.status === 409) {
      const conflictMsg =
        result.errors?.conductor?.[0] ??
        result.message ??
        "Cannot remove this conductor — they may be on an active shift.";
      return jsonError(conflictMsg, 409);
    }
    if (result.status === 422) {
      return jsonValidationError(
        result.message ?? "Validation failed.",
        result.errors,
        422
      );
    }
    return jsonError(result.message ?? "Failed to remove conductor.", result.status);
  }
  return jsonData(result.data);
}
