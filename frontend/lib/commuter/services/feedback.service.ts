/**
 * Commuter Feedback service (S6-T7 ride-history half).
 *
 * Calls the Next.js proxy routes (which forward to Laravel with the
 * httpOnly `chatco_session` cookie) — never calls Laravel directly.
 *
 *   POST /api/commuter/feedback          → submit({ shiftId, rating, comment? })
 *   GET  /api/commuter/feedback/history  → listMy()
 *
 * Responsibilities:
 *   - Map snake_case Laravel envelopes → camelCase view-models the UI uses
 *   - Translate the backend's 409 "already submitted" + 422 validation
 *     messages into typed error codes so the feedback modal can branch
 *     without parsing strings
 *   - Keep the modal component free of API/transport concerns
 *
 * Mirrors the pattern established by lib/commuter/services/qr-feedback.service.ts.
 *
 * NOTE on conductor_id: the backend (S6-T2 as implemented in T6) DERIVES
 * conductor_id from the shift_log row — it is NOT accepted from the client
 * (see StoreFeedbackRequest). `submit()` therefore accepts an optional
 * `conductorId` for API symmetry with the S6-T7 spec, but does NOT forward
 * it; the server stamps the feedback to both the driver's + conductor's
 * profiles based solely on `shift_id`.
 */

import { api, ApiError } from "@/lib/api/client";
import { COMMUTER_API } from "@/lib/commuter/endpoints";

// ─── Raw backend shapes ─────────────────────────────────────────────

/**
 * `data` payload returned by POST /api/v1/commuter/feedback (FeedbackController::store).
 *
 * The 201 response carries the freshly-created Feedback model — its bare
 * attributes (no relations eager-loaded on the write path). We only need a
 * handful of fields for the read-only "View Feedback" state.
 */
interface RawFeedback {
  id: string;
  shift_id: string;
  rating: number;
  category: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

/** Laravel ApiResponse envelope. */
interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, string[]> | null;
  meta: unknown;
}

/** Shape of the listForCommuter() service result. */
interface RawCommuterFeedbackList {
  feedback: RawFeedback[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
  };
}

// ─── Frontend view-models ──────────────────────────────────────────

/**
 * A single feedback record the commuter submitted. Used both for the
 * freshly-submitted row (POST 201 response) and for the read-only list
 * (GET history). The `shiftId` is the join key against ride rows.
 */
export interface Feedback {
  id: string;
  shiftId: string;
  rating: number;
  category: string | null;
  comment: string | null;
  createdAt: string;
}

// ─── Typed errors ───────────────────────────────────────────────────

export type FeedbackErrorCode =
  /**
   * 409 — the commuter already submitted feedback for this shift_id.
   * The unique (commuter_id, shift_id) constraint fired. The UI switches
   * the ride row to "View Feedback" and reopens the modal read-only.
   */
  | "already_submitted"
  /**
   * 422 — the backend rejected the payload (rating out of range, shift_id
   * missing/unknown, comment too long, etc.). Surface the message inline.
   */
  | "validation"
  /**
   * 422 — "You have not ridden with this conductor" (defensive; shouldn't
   * happen when shift_id is pre-filled from a real ride row, but handled
   * so the UI can show a clear message instead of a generic 422).
   */
  | "not_ridden"
  /** 403 — caller is not a COMMUTER (conductor/admin token reached the route). */
  | "forbidden"
  /** 401 — session expired; caller should redirect to login. */
  | "unauthenticated"
  /** 5xx / network failure / unexpected error. */
  | "network";

/**
 * Thrown by `submit()` and `listMy()` on any non-success response.
 *
 * Carries a stable `code` so the modal UI can branch:
 *   - "already_submitted" → "You already left feedback for this ride" +
 *     switch the row to read-only "View Feedback".
 *   - "not_ridden"        → inline error (defensive).
 *   - "validation"        → inline error with the server message.
 *   - "unauthenticated"   → redirect to /login.
 *   - "network"           → generic retry prompt.
 */
export class FeedbackOperationError extends Error {
  constructor(
    public code: FeedbackErrorCode,
    message: string
  ) {
    super(message);
    this.name = "FeedbackOperationError";
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Map a raw snake_case Feedback row → the camelCase view-model. */
function mapFeedback(raw: RawFeedback): Feedback {
  return {
    id: raw.id,
    shiftId: raw.shift_id,
    rating: typeof raw.rating === "number" ? raw.rating : Number(raw.rating) || 0,
    category: raw.category ?? null,
    comment: raw.comment ?? null,
    createdAt: raw.created_at,
  };
}

/**
 * Map a Laravel 422 message string → typed error code.
 *
 * The backend (`FeedbackService::submit()` + `StoreFeedbackRequest`) emits:
 *   - "You have already submitted feedback for this shift" → mapped to 409
 *     at the controller, so it never reaches here as 422. Kept defensively.
 *   - "You have not ridden with this conductor"            → not_ridden
 *   - any other validation message                          → validation
 */
function classifyValidationMessage(message: string): FeedbackErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes("not ridden") || lower.includes("never rode")) {
    return "not_ridden";
  }
  if (lower.includes("already submitted")) {
    return "already_submitted";
  }
  return "validation";
}

/** Extract the human message from an ApiError body (Laravel envelope). */
function readMessage(err: ApiError, fallback: string): string {
  const body = err.body as { message?: string } | null;
  return body?.message ?? fallback;
}

// ─── Service ────────────────────────────────────────────────────────

/**
 * Submit post-ride feedback for a specific shift.
 *
 * The `shiftId` comes from the ride row (the payment history's
 * `transaction.shift_id`, which links to the shift_log that served the
 * ride). The backend derives driver_id + conductor_id + vehicle_id from
 * that shift_log — the client never sends them, preventing impersonation.
 *
 * @throws {FeedbackOperationError}
 *   - 409 → `already_submitted` (commuter already rated this shift)
 *   - 422 → `validation` | `not_ridden`
 *   - 403 → `forbidden`
 *   - 401 → `unauthenticated`
 *   - 5xx → `network`
 */
export async function submit(params: {
  shiftId: string;
  rating: number;
  comment?: string;
  /** Accepted for API symmetry with the S6-T7 spec; NOT forwarded (server-derived). */
  conductorId?: string;
}): Promise<Feedback> {
  const { shiftId, rating, comment } = params;

  try {
    const response = await api.post<ApiResponseEnvelope<RawFeedback>>(
      COMMUTER_API.feedback.submit,
      {
        shift_id: shiftId,
        rating,
        // Omit comment entirely when empty so the backend treats it as null.
        ...(comment && comment.trim() ? { comment: comment.trim() } : {}),
      }
    );

    return mapFeedback(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      const message = readMessage(err, "Unable to submit feedback.");

      switch (err.status) {
        case 409:
          // Backend maps the unique-constraint violation to 409.
          throw new FeedbackOperationError("already_submitted", message);
        case 422:
          throw new FeedbackOperationError(classifyValidationMessage(message), message);
        case 403:
          throw new FeedbackOperationError("forbidden", message);
        case 401:
          throw new FeedbackOperationError("unauthenticated", message);
        default:
          throw new FeedbackOperationError("network", message);
      }
    }
    throw new FeedbackOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Fetch the authenticated commuter's own feedback history (newest first).
 *
 * Used once when the Payment History modal opens, to build a
 * `{ shiftId → Feedback }` map. Each PAID ride row is then marked
 * "Feedback submitted" (read-only) if its shiftId is in the map, or
 * "Leave Feedback" (submit) otherwise.
 *
 * Fetches a single large page (per_page=100) — a commuter's lifetime
 * feedback volume is small, so one round-trip is enough and keeps the
 * modal's feedback map complete without pagination plumbing.
 *
 * @throws {FeedbackOperationError}
 *   - 403 → `forbidden`
 *   - 401 → `unauthenticated`
 *   - 5xx → `network`
 */
export async function listMy(): Promise<Feedback[]> {
  try {
    const response = await api.get<ApiResponseEnvelope<RawCommuterFeedbackList>>(
      `${COMMUTER_API.feedback.history}?per_page=100`
    );

    const rows = response.data?.feedback ?? [];
    return rows.map(mapFeedback);
  } catch (err) {
    if (err instanceof ApiError) {
      const message = readMessage(err, "Unable to load your feedback history.");

      switch (err.status) {
        case 403:
          throw new FeedbackOperationError("forbidden", message);
        case 401:
          throw new FeedbackOperationError("unauthenticated", message);
        default:
          throw new FeedbackOperationError("network", message);
      }
    }
    throw new FeedbackOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}
