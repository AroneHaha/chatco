/**
 * Admin staff-feedback service (S6-T6 revised).
 *
 * Calls the Next.js proxy route `/api/admin/feedback` which forwards to
 * Laravel's `GET /api/v1/admin/feedback?conductor_id=|driver_id=`. The proxy
 * attaches the Sanctum bearer token from the httpOnly `chatco_session`
 * cookie — never called directly from the browser.
 *
 * Responsibilities:
 *   - Map snake_case Laravel rows → camelCase view-models the modal uses
 *   - Translate 404 (staff not found) / 403 (role) / 422 (missing param)
 *     into typed errors the UI can branch on
 *
 * Used by the User Management page's "double-click a conductor/driver row"
 * flow — the modal shows aggregate stats + paginated feedback rows.
 */

// ─── Raw backend shapes ─────────────────────────────────────────────

interface RawFeedbackRow {
  id: string;
  shift_id: string;
  vehicle_id: string;
  driver_id: string;
  conductor_id: string;
  commuter_id: string;
  rating: number;
  category: string | null;
  comment: string | null;
  created_at: string | null;
  vehicle: { id: string; unit_number: string; plate_number: string } | null;
  commuter: { id: string; first_name: string | null; surname: string | null } | null;
}

interface RawFeedbackListResponse {
  staff: { id: string; role: "CONDUCTOR" | "DRIVER" };
  summary: {
    average_rating: number;
    total_count: number;
    distribution: Record<string, number>;
  };
  feedback: RawFeedbackRow[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
  };
}

// ─── Frontend view-model ────────────────────────────────────────────

export interface FeedbackRow {
  id: string;
  shiftId: string;
  rating: number;
  category: string | null;
  comment: string | null;
  createdAt: string | null;
  vehicle: { unitNumber: string; plateNumber: string } | null;
  commuter: { name: string } | null;
}

export interface FeedbackSummary {
  averageRating: number;
  totalCount: number;
  /** Keyed "5" → "1" with per-star counts. */
  distribution: Record<string, number>;
}

export interface FeedbackListResult {
  staff: { id: string; role: "CONDUCTOR" | "DRIVER" };
  summary: FeedbackSummary;
  feedback: FeedbackRow[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    lastPage: number;
    from: number | null;
    to: number | null;
  };
}

// ─── Query input ────────────────────────────────────────────────────

export interface FeedbackListQuery {
  /** conductor_profiles.id (== conductor user id, shared PK). */
  conductorId?: string;
  /** drivers.id. */
  driverId?: string;
  perPage?: number;
  page?: number;
}

// ─── Typed errors ───────────────────────────────────────────────────

export class FeedbackFetchError extends Error {
  constructor(
    public code:
      | "not_found"
      | "validation"
      | "forbidden"
      | "unauthenticated"
      | "network",
    message: string
  ) {
    super(message);
    this.name = "FeedbackFetchError";
  }
}

// ─── Mapper ─────────────────────────────────────────────────────────

function mapCommuterName(
  c: RawFeedbackRow["commuter"]
): string {
  if (!c) return "Anonymous";
  const first = c.first_name?.trim() ?? "";
  const last = c.surname?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || "Anonymous";
}

function mapRow(raw: RawFeedbackRow): FeedbackRow {
  return {
    id: raw.id,
    shiftId: raw.shift_id,
    rating: raw.rating,
    category: raw.category,
    comment: raw.comment,
    createdAt: raw.created_at,
    vehicle: raw.vehicle
      ? {
          unitNumber: raw.vehicle.unit_number,
          plateNumber: raw.vehicle.plate_number,
        }
      : null,
    commuter: raw.commuter ? { name: mapCommuterName(raw.commuter) } : null,
  };
}

function mapResult(raw: RawFeedbackListResponse): FeedbackListResult {
  return {
    staff: raw.staff,
    summary: {
      averageRating: raw.summary.average_rating,
      totalCount: raw.summary.total_count,
      distribution: raw.summary.distribution,
    },
    feedback: raw.feedback.map(mapRow),
    pagination: {
      currentPage: raw.pagination.current_page,
      perPage: raw.pagination.per_page,
      total: raw.pagination.total,
      lastPage: raw.pagination.last_page,
      from: raw.pagination.from,
      to: raw.pagination.to,
    },
  };
}

// ─── Service function ───────────────────────────────────────────────

const API_PATH = "/api/admin/feedback";

function buildQueryString(q: FeedbackListQuery): string {
  const params = new URLSearchParams();
  if (q.conductorId) params.set("conductor_id", q.conductorId);
  if (q.driverId) params.set("driver_id", q.driverId);
  if (q.perPage) params.set("per_page", String(q.perPage));
  if (q.page) params.set("page", String(q.page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Fetch paginated feedback + summary stats for a conductor or driver.
 *
 * Exactly one of `conductorId` / `driverId` must be supplied — the backend
 * returns 422 if neither is present. The caller chooses which based on the
 * row's role (CONDUCTOR → conductorId, DRIVER → driverId).
 *
 * @throws {FeedbackFetchError} 404 (staff not found) / 422 (missing param) /
 *   403 (role) / 401 (session expired) / 502 (network).
 */
export async function list(
  query: FeedbackListQuery
): Promise<FeedbackListResult> {
  const qs = buildQueryString(query);
  const res = await fetch(`${API_PATH}${qs}`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try {
      const body = await res.clone().json();
      if (body?.message) message = body.message;
    } catch {
      /* keep default message */
    }
    throw translateError(res.status, message);
  }

  const json = await res.json();
  // The proxy wraps Laravel's `data` field in `{ data: ... }`.
  return mapResult(json.data as RawFeedbackListResponse);
}

function translateError(status: number, message: string): FeedbackFetchError {
  switch (status) {
    case 401:
      return new FeedbackFetchError(
        "unauthenticated",
        "Your session has expired. Please log in again."
      );
    case 403:
      return new FeedbackFetchError(
        "forbidden",
        message || "You do not have permission to view feedback."
      );
    case 404:
      return new FeedbackFetchError("not_found", message || "Staff member not found.");
    case 422:
      return new FeedbackFetchError(
        "validation",
        message || "A conductor_id or driver_id is required."
      );
    case 502:
      return new FeedbackFetchError(
        "network",
        "Unable to reach the server. Please try again."
      );
    default:
      return new FeedbackFetchError("network", message || "An unexpected error occurred.");
  }
}
