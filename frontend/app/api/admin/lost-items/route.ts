import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET  /api/admin/lost-items         — paginated list with claims eager-loaded
 * POST /api/admin/lost-items         — admin reports a new lost item
 *
 * Sprint 6 (S6-T8) — admin Lost & Found management.
 *
 * GET forwards filter query params (status, category, per_page, page) to
 * Laravel GET /api/v1/admin/lost-items, which eager-loads claims + releasedTo
 * + closedBy so the admin grid can show claimant info + handover state.
 *
 * POST forwards the { item_name, description, ... } body to Laravel, which
 * creates the item (admin is the reporter). The 201 response carries the
 * freshly-created LostItem row.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  const result = await proxyToLaravel(request, `/admin/lost-items${qs}`, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load lost items.", result.status);
  return jsonData(result.data);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/lost-items`, {
    method: "POST",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to report item.", result.status);
  }
  return jsonData(result.data, 201);
}
