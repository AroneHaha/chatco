import { NextRequest } from "next/server";
import {
  proxyToLaravel,
} from "@/lib/conductor/server/proxy";
import {
  jsonData,
  jsonError,
  jsonValidationError,
} from "@/lib/conductor/server/response";

/**
 * GET /api/admin/users/{id}
 *
 * Proxies to Laravel `GET /api/v1/admin/users/{id}` — returns a single
 * user with their profile (role-scoped fields). The Laravel envelope
 * (incl. 404 for missing user) is passed through verbatim.
 *
 * Backend (S5-T3): AdminUserController::show → AdminService::getUser
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("User ID is missing.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/users/${id}`, {
    method: "GET",
  });

  if (!result.ok) {
    return jsonError(
      result.message ?? "Failed to load user.",
      result.status
    );
  }
  return jsonData(result.data);
}

/**
 * PUT /api/admin/users/{id}
 *
 * Body (all optional, but at least one field required):
 *   first_name?: string        (profile first name)
 *   middle_name?: string|null  (profile middle name)
 *   last_name?: string         (profile last name — mapped to `surname`
 *                               for commuters server-side)
 *   account_status?: "ACTIVE"|"SUSPENDED"  (commuter-only)
 *   contact_number?: string    (commuter-only, phone format)
 *
 * Email, role, and password are deliberately NOT editable through this
 * endpoint (server-enforced via UpdateUserRequest whitelist).
 *
 * The Laravel envelope (incl. 404 / 422 validation) is passed through.
 * On success, returns the updated user so the caller can refresh the
 * list row without an extra GET round-trip.
 *
 * Backend (S5-T3): AdminUserController::update → AdminService::updateUser
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("User ID is missing. Please close and reopen the modal.", 400);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/users/${id}`, {
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
    return jsonError(
      result.message ?? "Failed to update user.",
      result.status
    );
  }
  return jsonData(result.data);
}

/**
 * DELETE /api/admin/users/{id}
 *
 * Soft-deletes the user (locks them out of auth, preserves financial
 * history). Guards enforced server-side: cannot delete self, cannot
 * delete the last admin.
 *
 * Returns 200 on success (Laravel returns `{ success: true, data: null }`).
 * 404 if the user doesn't exist; 422 if a guard is violated (e.g.
 * "You cannot delete your own account.").
 *
 * Backend (S5-T3): AdminUserController::destroy → AdminService::deleteUser
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id === "undefined") {
    return jsonError("User ID is missing.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/users/${id}`, {
    method: "DELETE",
  });

  if (!result.ok) {
    // 422 = business-rule violation (self-delete / last-admin guard) —
    // forward as validation-style error so the UI can surface the message.
    if (result.status === 422) {
      return jsonValidationError(
        result.message ?? "Cannot delete this user.",
        result.errors,
        422
      );
    }
    return jsonError(
      result.message ?? "Failed to delete user.",
      result.status
    );
  }
  return jsonData(result.data);
}
