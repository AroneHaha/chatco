import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * Shared error-forwarding helper for the vehicle [id] routes.
 *
 * - 422 → jsonValidationError (Laravel validation shape, field-level errors)
 * - 409 → jsonValidationError with status 409 (active-shift guard; same
 *         `{ message, errors }` body so the service can extract the
 *         human-readable reason from `errors.vehicle[0]`)
 * - everything else → plain jsonError
 *
 * Returning the 409 with the `errors` map (instead of just `message:
 * "Conflict"`) is what lets vehicle.service.ts::remove() surface the
 * specific "Cannot delete a vehicle that is currently on an active
 * shift..." message in the delete-confirm modal.
 */
function forwardError(
  status: number,
  message: string | null,
  errors: Record<string, string[]> | null,
  fallback: string
) {
  if (status === 422) {
    return jsonValidationError(message ?? "Validation failed.", errors, 422);
  }
  if (status === 409) {
    return jsonValidationError(message ?? "Conflict.", errors, 409);
  }
  return jsonError(message ?? fallback, status);
}

/**
 * PUT/PATCH /api/admin/vehicles/{id}
 * Proxies to Laravel PUT/PATCH /api/v1/admin/vehicles/{id}.
 *
 * Body must contain: unit_number, plate_number, route_id (all required).
 * Optional: driver_id, conductor_id, status.
 *
 * NOTE: In Next.js 16, `params` is a Promise and must be awaited before
 * accessing its properties. See:
 * https://nextjs.org/docs/messages/sync-dynamic-apis
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Defensive guard: if the frontend somehow sends "undefined" or empty as
  // the ID (stale bundle, race condition, etc.), bail out with a clear error
  // instead of forwarding the literal string "undefined" to Laravel (which
  // would 404 with "No query results for model [App\Models\Vehicle] undefined").
  if (!id || id === "undefined") {
    return jsonError("Vehicle ID is missing. Please close and reopen the modal.", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/vehicles/${id}`, {
    method: "PUT",
    body,
  });

  if (!result.ok) {
    return forwardError(result.status, result.message, result.errors, "Failed to update vehicle.");
  }
  return jsonData(result.data);
}

// PATCH mirrors PUT — same controller method on Laravel side.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Vehicle ID is missing. Please close and reopen the modal.", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/vehicles/${id}`, {
    method: "PATCH",
    body,
  });

  if (!result.ok) {
    return forwardError(result.status, result.message, result.errors, "Failed to update vehicle.");
  }
  return jsonData(result.data);
}

/**
 * DELETE /api/admin/vehicles/{id}
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("Vehicle ID is missing.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/vehicles/${id}`, {
    method: "DELETE",
  });

  if (!result.ok) {
    return forwardError(result.status, result.message, result.errors, "Failed to delete vehicle.");
  }
  return jsonData(result.data);
}
