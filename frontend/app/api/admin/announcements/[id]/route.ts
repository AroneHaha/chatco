import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/admin/announcements/{id}  — admin detail view
 * PUT /api/admin/announcements/{id}  — admin edits title/message/type/status
 *
 * Sprint 6 (S6-T9) — admin announcement management.
 *
 * GET returns the single announcement row with the `creator` eager-loaded.
 *
 * PUT forwards the { title?, message?, type?, status? } body to Laravel. All
 * fields are optional (partial update). Validation mirrors the create rules
 * (title ≤ 200, message ≤ 5000, type ≤ 20, status ∈ ACTIVE|ARCHIVED). Status
 * changes are also routed through the archive endpoint, but status is allowed
 * here too for one-shot edits.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 *
 * Response codes:
 *   200 — announcement retrieved / updated
 *   404 — announcement not found
 *   422 — validation failed (field-level errors in `errors`)
 *   403 — non-admin
 *   401 — session expired
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Announcement ID is required.", 400);

  const result = await proxyToLaravel(request, `/admin/announcements/${id}`, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load announcement.", result.status);
  return jsonData(result.data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id === "undefined") return jsonError("Announcement ID is required.", 400);

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/announcements/${id}`, {
    method: "PUT",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to update announcement.", result.status);
  }
  return jsonData(result.data);
}
