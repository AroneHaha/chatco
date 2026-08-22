/**
 * Shared Announcements service (S6-T9).
 *
 * Single CRUD gateway used by BOTH the admin announcement-management page
 * and the shared announcement bell (admin layout) + the commuter rewards
 * "Latest Updates" panel. Calls the Next.js proxy routes (which forward to
 * Laravel with the httpOnly `chatco_session` cookie) — never Laravel directly.
 *
 *   USER-FACING (any authenticated role — bell + commuter panel):
 *     GET  /api/announcements                  → list({ unreadOnly?, page?, perPage? })
 *     GET  /api/announcements/unread-count     → unreadCount()
 *     POST /api/announcements/{id}/read        → markRead(id)
 *
 *   ADMIN (role:ADMIN):
 *     GET    /api/admin/announcements          → listForAdmin({ status?, page?, perPage? })
 *     POST   /api/admin/announcements          → create({ title, message, type?, status? })
 *     GET    /api/admin/announcements/{id}     → show(id)
 *     PUT    /api/admin/announcements/{id}     → update(id, { title?, message?, type?, status? })
 *     PATCH  /api/admin/announcements/{id}/archive → archive(id)
 *
 * Responsibilities:
 *   - Map snake_case Laravel rows → camelCase view-models the existing UI uses.
 *   - Translate backend HTTP codes (404/422/403/401) into typed error codes so
 *     the UI can branch without parsing strings.
 *   - Map the backend status enum (ACTIVE/ARCHIVED) to display strings the
 *     existing UI expects (Active/Archived).
 *
 * Backend contract notes (deviations from the T9 spec, following the real
 * S6-T4 implementation — same approach as S6-T8):
 *   - The content field is `message` (NOT `body`). Max 5000 chars.
 *   - markRead returns 200 with the standard envelope (NOT 204), data:null.
 *   - Create is admin-only at POST /admin/announcements (NOT POST /announcements).
 *   - The backend supports an optional `type` field (max 20) for categorization
 *     (e.g. 'holiday', 'route', 'system') — surfaced here as an optional param.
 *
 * Mirrors the pattern established by lib/shared/services/lost-found.service.ts.
 */

import { api, ApiError, RequestCancelledError } from "@/lib/api/client";

// ─── Backend status enums ────────────────────────────────────────────

/**
 * Backend announcements.status values (AnnouncementService constants).
 * ACTIVE announcements appear in the user-facing feed; ARCHIVED ones are
 * admin-only (visible in the admin table with the ARCHIVED filter).
 */
export type AnnouncementStatus = "ACTIVE" | "ARCHIVED";

// ─── Raw backend shapes ─────────────────────────────────────────────

/**
 * An announcements row as returned by Laravel (snake_case).
 * `is_read` is only present on the user-facing feed (resolved via a leftJoin
 * on announcement_reads); admin list/show returns the raw row without it.
 * `creator` is eager-loaded only on admin list/show.
 */
interface RawAnnouncement {
  id: string;
  type: string | null;
  title: string;
  message: string;
  created_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  /** Only on the user-facing feed (listForUser). */
  is_read?: boolean;
  /** Only on admin list/show (eager-loaded creator). */
  creator?: {
    id: string;
    first_name: string | null;
    surname: string | null;
    email: string | null;
  } | null;
}

/** Laravel ApiResponse envelope. */
interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  errors: Record<string, string[]> | null;
  meta: unknown;
}

/** Laravel paginator shape (data is the array of rows). */
interface PaginatedEnvelope<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

// ─── Frontend view-models (camelCase) ───────────────────────────────

/**
 * An announcement, in the shape the existing commuter + admin UIs consume.
 * Kept compatible with the legacy `Announcement` interface in
 * `types/announcement.ts` so the commuter rewards panel didn't need rewriting.
 */
export interface Announcement {
  id: string;
  type: string;
  title: string;
  message: string;
  /** Raw backend status (ACTIVE/ARCHIVED). */
  status: AnnouncementStatus;
  /** Display status for the admin UI (Active/Archived). */
  displayStatus: string;
  /** ISO timestamp (created_at). */
  createdAt: string;
  /** Per-user read flag (user-facing feed only; false on admin list). */
  isRead: boolean;
  /** Admin who created the announcement (admin list/show only). */
  createdBy: string | null;
}

/** Paginated list result. */
export interface AnnouncementPage {
  items: Announcement[];
  page: number;
  lastPage: number;
  total: number;
}

// ─── Typed errors ───────────────────────────────────────────────────

export type AnnouncementErrorCode =
  /** 404 — announcement not found. */
  | "not_found"
  /** 422 — validation (title too long, message empty, etc.). */
  | "validation"
  /** 403 — caller lacks the role (e.g. commuter hitting admin create). */
  | "forbidden"
  /** 401 — session expired. */
  | "unauthenticated"
  /** 5xx / network failure. */
  | "network";

/**
 * Thrown by any service method on a non-success response. Carries a stable
 * `code` so the UI can branch (e.g. 422 → inline field error; 403 → "You do
 * not have permission…"; 401 → redirect to login).
 */
export class AnnouncementOperationError extends Error {
  constructor(
    public code: AnnouncementErrorCode,
    message: string,
    /** Field-level validation errors from a 422 (shape: { field: ["msg"] }). */
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AnnouncementOperationError";
  }
}

// ─── Status mappers ─────────────────────────────────────────────────

/**
 * Map a backend status → the display string the admin UI badge expects.
 *   ACTIVE   → Active
 *   ARCHIVED → Archived
 */
function mapDisplayStatus(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "ARCHIVED":
      return "Archived";
    default:
      return status;
  }
}

// ─── Row mappers ────────────────────────────────────────────────────

function mapAnnouncement(raw: RawAnnouncement): Announcement {
  const creatorName = raw.creator
    ? [raw.creator.first_name, raw.creator.surname].filter(Boolean).join(" ").trim() ||
      raw.creator.email ||
      "Admin"
    : null;

  return {
    id: raw.id,
    type: raw.type ?? "",
    title: raw.title ?? "",
    message: raw.message ?? "",
    status: (raw.status as AnnouncementStatus) ?? "ACTIVE",
    displayStatus: mapDisplayStatus(raw.status ?? "ACTIVE"),
    createdAt: raw.created_at,
    isRead: Boolean(raw.is_read ?? false),
    createdBy: creatorName,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Extract the human message from an ApiError body (Laravel envelope). */
function readMessage(err: ApiError, fallback: string): string {
  const body = err.body as { message?: string } | null;
  return body?.message ?? fallback;
}

/** Extract the field-level errors from a Laravel 422 response. */
function readFieldErrors(err: ApiError): Record<string, string[]> | undefined {
  const body = err.body as { errors?: Record<string, string[]> } | null;
  return body?.errors ?? undefined;
}

/** Map an ApiError to a typed AnnouncementOperationError. */
function classifyError(err: ApiError, fallback: string): AnnouncementOperationError {
  const message = readMessage(err, fallback);
  switch (err.status) {
    case 404:
      return new AnnouncementOperationError("not_found", message);
    case 422:
      return new AnnouncementOperationError("validation", message, readFieldErrors(err));
    case 403:
      return new AnnouncementOperationError("forbidden", message);
    case 401:
      return new AnnouncementOperationError("unauthenticated", message);
    default:
      return new AnnouncementOperationError("network", message);
  }
}

/** Build a query string from an optional params object, skipping empties. */
function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "boolean") {
      if (v) sp.set(k, "1");
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ─── Service: user-facing feed (any auth role) ──────────────────────

/**
 * Fetch a paginated list of ACTIVE announcements with the per-user is_read flag.
 *
 * @throws {AnnouncementOperationError} 401/403/5xx
 */
export async function list(params: {
  unreadOnly?: boolean;
  page?: number;
  perPage?: number;
} = {}): Promise<AnnouncementPage> {
  const qs = buildQuery({
    unread_only: params.unreadOnly,
    page: params.page,
    per_page: params.perPage,
  });
  try {
    const response = await api.get<ApiResponseEnvelope<PaginatedEnvelope<RawAnnouncement>>>(
      `/api/announcements${qs}`
    );
    const p = response.data;
    return {
      items: (p?.data ?? []).map(mapAnnouncement),
      page: p?.current_page ?? params.page ?? 1,
      lastPage: p?.last_page ?? 1,
      total: p?.total ?? 0,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load announcements.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Fetch the count of ACTIVE announcements the current user has NOT read.
 * Powers the bell badge. Pass `types` to scope the count (e.g. the Lost &
 * Found Claims tab badge only counts claim status-update announcements) —
 * omitted, it counts every unread announcement.
 *
 * @throws {AnnouncementOperationError} 401/5xx
 */
export async function unreadCount(params: { types?: string[] } = {}): Promise<number> {
  const qs = buildQuery({ types: params.types?.length ? params.types.join(",") : undefined });
  try {
    const response = await api.get<ApiResponseEnvelope<{ count: number }>>(
      `/api/announcements/unread-count${qs}`
    );
    return response.data?.count ?? 0;
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load unread count.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Mark every currently-unread ACTIVE announcement visible to the user as
 * read in one request, optionally scoped to `types` (e.g. the Lost & Found
 * Claims tab marks only claim status-update announcements as read when
 * opened, leaving unrelated unread announcements untouched).
 *
 * @returns The number of rows newly marked as read.
 * @throws {AnnouncementOperationError} 401/5xx
 */
export async function markAllRead(params: { types?: string[] } = {}): Promise<number> {
  const qs = buildQuery({ types: params.types?.length ? params.types.join(",") : undefined });
  try {
    const response = await api.post<ApiResponseEnvelope<{ count: number }>>(
      `/api/announcements/mark-all-read${qs}`
    );
    return response.data?.count ?? 0;
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to mark these announcements as read.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Mark an announcement as read for the current user. Idempotent — re-reading
 * just refreshes read_at. The backend returns 200 with data:null (NOT 204,
 * despite the spec — following the real implementation).
 *
 * @throws {AnnouncementOperationError}
 *   - 404 → announcement not found (or archived)
 *   - 401 → unauthenticated
 *   - 5xx → network
 */
export async function markRead(id: string): Promise<void> {
  try {
    await api.post<ApiResponseEnvelope<null>>(`/api/announcements/${id}/read`);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to mark this announcement as read.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

// ─── Service: admin CRUD (role:ADMIN) ───────────────────────────────

/**
 * Fetch a paginated list of ALL announcements (incl. ARCHIVED) for admin QA.
 * Each row eager-loads the `creator` relation.
 *
 * @throws {AnnouncementOperationError} 401/403/5xx
 */
export async function listForAdmin(params: {
  status?: string;
  type?: string;
  search?: string;
  /** An exact Y-m-d from the date picker. Wins over dateRange if both are set. */
  date?: string;
  /** 'today' | 'last_7_days' | 'this_month' | 'all' — scopes by created_at server-side. */
  dateRange?: string;
  page?: number;
  perPage?: number;
  /** Cancels a stale request superseded by a newer search/page/filter change. */
  signal?: AbortSignal;
} = {}): Promise<AnnouncementPage> {
  const qs = buildQuery({
    status: params.status,
    type: params.type,
    search: params.search,
    date: params.date || undefined,
    // The exact date picker and the range dropdown are mutually exclusive in
    // the UI — only send the range when there's no specific date selected.
    date_range: !params.date && params.dateRange && params.dateRange !== "all" ? params.dateRange : undefined,
    page: params.page,
    per_page: params.perPage,
  });
  try {
    const response = await api.get<ApiResponseEnvelope<PaginatedEnvelope<RawAnnouncement>>>(
      `/api/admin/announcements${qs}`,
      undefined,
      { signal: params.signal }
    );
    const p = response.data;
    return {
      items: (p?.data ?? []).map(mapAnnouncement),
      page: p?.current_page ?? params.page ?? 1,
      lastPage: p?.last_page ?? 1,
      total: p?.total ?? 0,
    };
  } catch (err) {
    if (err instanceof RequestCancelledError) throw err;
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load announcements.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Count admin-list announcements matching the given filters, without paging
 * through rows or eager-loading the creator relation — powers the header's
 * Active/Archived totals far more cheaply than listForAdmin({ perPage: 1 }),
 * which still runs a full paginator (count query + a row query + a creator
 * eager-load) just to read `.total`.
 *
 * @throws {AnnouncementOperationError} 401/403/5xx
 */
export async function countForAdmin(params: {
  status?: string;
  search?: string;
  date?: string;
  dateRange?: string;
  signal?: AbortSignal;
} = {}): Promise<number> {
  const qs = buildQuery({
    status: params.status,
    search: params.search,
    date: params.date || undefined,
    date_range: !params.date && params.dateRange && params.dateRange !== "all" ? params.dateRange : undefined,
    count_only: 1,
  });
  try {
    const response = await api.get<ApiResponseEnvelope<{ total: number }>>(
      `/api/admin/announcements${qs}`,
      undefined,
      { signal: params.signal }
    );
    return response.data?.total ?? 0;
  } catch (err) {
    if (err instanceof RequestCancelledError) throw err;
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load announcement counts.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Fetch a single announcement by ID (admin detail view).
 * @throws {AnnouncementOperationError} 404/401/403/5xx
 */
export async function show(id: string): Promise<Announcement> {
  try {
    const response = await api.get<ApiResponseEnvelope<RawAnnouncement>>(
      `/api/admin/announcements/${id}`
    );
    return mapAnnouncement(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load this announcement.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Admin creates a new announcement. Status defaults to ACTIVE on the backend.
 *
 * @throws {AnnouncementOperationError}
 *   - 422 → validation (title > 200, message > 5000, type > 20, bad status)
 *   - 403 → non-admin
 *   - 401 → unauthenticated
 */
export async function create(params: {
  title: string;
  message: string;
  type?: string;
  status?: AnnouncementStatus;
}): Promise<Announcement> {
  try {
    const response = await api.post<ApiResponseEnvelope<RawAnnouncement>>(
      `/api/admin/announcements`,
      {
        title: params.title,
        message: params.message,
        ...(params.type ? { type: params.type } : {}),
        ...(params.status ? { status: params.status } : {}),
      }
    );
    return mapAnnouncement(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to create this announcement.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Admin updates an announcement (partial update — all fields optional).
 *
 * @throws {AnnouncementOperationError} 404/422/401/403/5xx
 */
export async function update(
  id: string,
  params: {
    title?: string;
    message?: string;
    type?: string | null;
    status?: AnnouncementStatus;
  }
): Promise<Announcement> {
  try {
    const response = await api.put<ApiResponseEnvelope<RawAnnouncement>>(
      `/api/admin/announcements/${id}`,
      {
        ...(params.title !== undefined ? { title: params.title } : {}),
        ...(params.message !== undefined ? { message: params.message } : {}),
        ...(params.type !== undefined ? { type: params.type } : {}),
        ...(params.status !== undefined ? { status: params.status } : {}),
      }
    );
    return mapAnnouncement(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to update this announcement.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}

/**
 * Archive an announcement (status=ARCHIVED). Idempotent — archiving an
 * already-archived item is a no-op. Archived items disappear from the
 * commuter bell + the user-facing feed.
 *
 * @throws {AnnouncementOperationError} 404/401/403/5xx
 */
export async function archive(id: string): Promise<Announcement> {
  try {
    const response = await api.patch<ApiResponseEnvelope<RawAnnouncement>>(
      `/api/admin/announcements/${id}/archive`
    );
    return mapAnnouncement(response.data);
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to archive this announcement.");
    }
    throw new AnnouncementOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}
