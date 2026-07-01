import { NextRequest, NextResponse } from "next/server";
import {
  resolveSessionInMemory,
  submitFeedbackInMemory,
  FeedbackError,
} from "@/lib/shared/server/inmemory-backend";

const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

/**
 * POST /api/commuter/feedback
 *
 * Sprint 6 (S6-T7) — Commuter post-ride feedback submission.
 *
 * PRIMARY: proxies to Laravel `POST /api/v1/commuter/feedback` (role:COMMUTER).
 * The backend derives driver_id + conductor_id + vehicle_id from the shift_log
 * row (never trusts client input), stamps commuter_id = auth()->id(), and
 * enforces one-feedback-per-shift via a unique constraint.
 *
 * FALLBACK: when Laravel is unreachable, persists the feedback in the in-memory
 * store. The driver_id + conductor_id + vehicle_id are derived from the
 * in-memory shift (matching the Laravel service), so the feedback lands on
 * BOTH the driver's and conductor's profiles.
 *
 * Response (both paths): Laravel envelope `{ success, data, message }` where
 * `data` is the freshly-created Feedback row.
 *   201 — created
 *   409 — "You have already submitted feedback for this shift" (duplicate)
 *   422 — validation (rating out of range, shift_id missing/unknown, …)
 *   401 — session expired
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated.", data: null, errors: null, meta: null },
      { status: 401 }
    );
  }

  const rawBody = await request.text();

  // ─── Try Laravel first ─────────────────────────────────────────────
  try {
    const res = await fetch(`${API_URL}${API_V1}/commuter/feedback`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: rawBody,
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

  let payload: { shift_id?: string; rating?: number; comment?: string; category?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body.", data: null, errors: null, meta: null },
      { status: 422 }
    );
  }

  const { shift_id, rating, comment, category } = payload;
  if (!shift_id || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json(
      { success: false, message: "shift_id and a rating (1–5) are required.", data: null, errors: null, meta: null },
      { status: 422 }
    );
  }

  try {
    const feedback = submitFeedbackInMemory(commuter.id, {
      shiftId: shift_id,
      rating,
      comment: comment?.trim() || undefined,
      category: category?.trim() || undefined,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: feedback.id,
          shift_id: feedback.shiftId,
          vehicle_id: feedback.vehicleId,
          driver_id: feedback.driverId,
          conductor_id: feedback.conductorId,
          commuter_id: feedback.commuterId,
          rating: feedback.rating,
          category: feedback.category,
          comment: feedback.comment,
          created_at: feedback.createdAt,
          updated_at: feedback.createdAt,
        },
        message: "Feedback submitted",
        errors: null,
        meta: null,
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error instanceof FeedbackError ? error.status : 422;
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unable to submit feedback.",
        data: null,
        errors: null,
        meta: null,
      },
      { status }
    );
  }
}
