import { NextRequest } from "next/server";
import { jsonError, jsonData } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import {
  resolveSessionInMemory,
  listFeedbackForConductorInMemory,
  listFeedbackForDriverInMemory,
} from "@/lib/shared/server/inmemory-backend";

/**
 * GET /api/admin/feedback?conductor_id={uuid}&per_page=&page=
 * GET /api/admin/feedback?driver_id={uuid}&per_page=&page=
 *
 * Sprint 6 (T6 revised) — Admin staff-feedback listing.
 *
 * Replaces the standalone admin "Feedback QR" module. The admin views
 * driver/conductor feedback from User Management by double-clicking a row.
 * The query string is forwarded verbatim to Laravel — the backend requires
 * ONE of conductor_id / driver_id (422 if neither) and returns paginated
 * feedback + a summary (average_rating, total_count, 5→1 distribution).
 *
 * FALLBACK: when Laravel is unreachable, reads from the SQLite sandbox store
 * and shapes the response to match the Laravel envelope
 * `{ staff, summary, feedback, pagination }` so the admin feedback modal
 * renders identically.
 */
export async function GET(request: NextRequest) {
  // Preserve the query string — pass conductor_id/driver_id/per_page/page through.
  const search = request.nextUrl.search;
  const path = `/admin/feedback${search}`;

  const result = await proxyToLaravel(request, path, { method: "GET" });
  if (result.ok) {
    return jsonData(result.data);
  }

  // Laravel rejected with a real error (not a network failure) — surface it.
  if (result.status !== 502) {
    return jsonError(result.message ?? "Failed to load feedback.", result.status);
  }

  // ─── SQLite fallback (Laravel unreachable) ──────────────────────────
  // Gate on the admin session (role:ADMIN) — mirrors Laravel middleware.
  const token = request.cookies.get("chatco_session")?.value;
  const admin = resolveSessionInMemory(token);
  if (!admin || admin.role !== "ADMIN") {
    return jsonError("Unauthorized. Admin session required.", 401);
  }

  const conductorId = request.nextUrl.searchParams.get("conductor_id");
  const driverId = request.nextUrl.searchParams.get("driver_id");
  const perPage = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("per_page") ?? "10", 10) || 10, 1), 100);

  if (!conductorId && !driverId) {
    return jsonError("Either conductor_id or driver_id is required.", 422);
  }

  const allFeedback = conductorId
    ? listFeedbackForConductorInMemory(conductorId)
    : listFeedbackForDriverInMemory(driverId!);

  // Build the summary (average_rating, total_count, 5→1 distribution) to
  // match the Laravel AdminFeedbackController::index response shape.
  const total = allFeedback.length;
  const distribution: Record<string, number> = {};
  for (const star of [5, 4, 3, 2, 1]) {
    distribution[String(star)] = allFeedback.filter((f) => f.rating === star).length;
  }
  const averageRating = total > 0
    ? Math.round((allFeedback.reduce((sum, f) => sum + f.rating, 0) / total) * 100) / 100
    : 0;

  // Paginate (newest first).
  const page = Math.max(parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10) || 1, 1);
  const start = (page - 1) * perPage;
  const pageRows = allFeedback.slice(start, start + perPage);

  return jsonData({
    staff: {
      id: conductorId ?? driverId,
      role: conductorId ? "CONDUCTOR" : "DRIVER",
    },
    summary: {
      average_rating: averageRating,
      total_count: total,
      distribution,
    },
    feedback: pageRows.map((f) => ({
      id: f.id,
      shift_id: f.shiftId,
      vehicle_id: f.vehicleId,
      driver_id: f.driverId,
      conductor_id: f.conductorId,
      commuter_id: f.commuterId,
      rating: f.rating,
      category: f.category,
      comment: f.comment,
      created_at: f.createdAt,
      updated_at: f.createdAt,
      vehicle: null,
      commuter: null,
    })),
    pagination: {
      current_page: page,
      per_page: perPage,
      total: total,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      from: total > 0 ? start + 1 : null,
      to: total > 0 ? Math.min(start + perPage, total) : null,
    },
  });
}
