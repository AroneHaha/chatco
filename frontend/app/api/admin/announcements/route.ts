import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET  /api/admin/announcements         — paginated list (incl. ARCHIVED) with creator
 * POST /api/admin/announcements         — admin creates a new announcement
 *
 * Sprint 6 (S6-T9) — admin announcement management.
 *
 * GET forwards filter query params (status, per_page, page) to Laravel
 * GET /api/v1/admin/announcements, which eager-loads the `creator` relation
 * so the admin table can show who published each announcement. The default
 * list includes BOTH Active + Archived (the admin table filters client-side).
 *
 * POST forwards the { title, message, type?, status? } body to Laravel, which
 * validates (title ≤ 200, message ≤ 5000, type ≤ 20, status ∈ ACTIVE|ARCHIVED)
 * and creates the announcement with created_by = auth user. The 201 response
 * carries the freshly-created row.
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search;
  const result = await proxyToLaravel(request, `/admin/announcements${qs}`, { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load announcements.", result.status);
  return jsonData(result.data);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const result = await proxyToLaravel(request, `/admin/announcements`, {
    method: "POST",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "Validation failed.", result.errors, 422);
    }
    return jsonError(result.message ?? "Failed to create announcement.", result.status);
  }
  return jsonData(result.data, 201);
}
