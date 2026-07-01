import { NextRequest, NextResponse } from "next/server";
import {
  resolveSessionInMemory,
  listMyFeedbackInMemory,
} from "@/lib/shared/server/inmemory-backend";

const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

/**
 * GET /api/commuter/feedback/history
 *
 * Sprint 6 (S6-T7) — The authenticated commuter's own feedback history.
 *
 * PRIMARY: proxies to Laravel `GET /api/v1/commuter/feedback`.
 * FALLBACK: when Laravel is unreachable, returns the in-memory feedback the
 * commuter has submitted, in the same `{ feedback, pagination }` envelope the
 * ride-history modal expects.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated.", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }

  const qs = request.nextUrl.search; // e.g. "?per_page=100"

  // ─── Try Laravel first ─────────────────────────────────────────────
  try {
    const res = await fetch(`${API_URL}${API_V1}/commuter/feedback${qs}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const body = await res.json().catch(() => null);
    return NextResponse.json(body ?? { success: false, message: "Request failed.", data: null, errors: null, meta: null }, {
      status: res.status,
    });
  } catch {
    // Laravel unreachable → fall through to in-memory fallback.
  }

  // ─── In-memory fallback ────────────────────────────────────────────
  const commuter = resolveSessionInMemory(token);
  if (!commuter || commuter.role !== "COMMUTER") {
    return NextResponse.json(
      { success: false, message: "Unauthenticated.", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }

  const rows = listMyFeedbackInMemory(commuter.id);
  return NextResponse.json({
    success: true,
    data: {
      feedback: rows.map((f) => ({
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
      })),
      pagination: {
        current_page: 1,
        per_page: rows.length,
        total: rows.length,
        last_page: 1,
        from: rows.length > 0 ? 1 : null,
        to: rows.length > 0 ? rows.length : null,
      },
    },
    message: "Feedback history retrieved",
    errors: null,
    meta: null,
  });
}
