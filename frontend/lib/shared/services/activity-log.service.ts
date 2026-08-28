/**
 * Admin Activity Logs service.
 *
 * Read-only audit trail — every admin-mutating action across the panel
 * writes one row server-side (ActivityLogService::record()), this service
 * only reads them.
 *
 *   GET /api/admin/activity-logs → listForAdmin({ category?, search?, date?, dateRange?, page?, perPage? })
 *
 * Mirrors the pattern established by lib/shared/services/announcement.service.ts
 * (raw→view-model mapper, typed error class, buildQuery helper, AbortSignal
 * support for stale-request cancellation) — see that file for the fuller
 * write-up of the conventions being followed here.
 */

import { api, ApiError, RequestCancelledError } from "@/lib/api/client";

// ─── Raw backend shape ──────────────────────────────────────────────

interface RawActivityLog {
  id: string;
  category: string;
  description: string;
  /** Null when the action was not attributable to an admin (renders as "System"). */
  actor_name: string | null;
  created_at: string;
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

// ─── Frontend view-model (camelCase) ────────────────────────────────

export interface ActivityLog {
  id: string;
  category: string;
  description: string;
  /** The admin's display name, or "System" for a non-admin-triggered event. */
  by: string;
  /** ISO timestamp (created_at). */
  createdAt: string;
}

export interface ActivityLogPage {
  items: ActivityLog[];
  page: number;
  lastPage: number;
  total: number;
}

// ─── Typed errors ───────────────────────────────────────────────────

export type ActivityLogErrorCode =
  /** 403 — caller lacks the role. */
  | "forbidden"
  /** 401 — session expired. */
  | "unauthenticated"
  /** 5xx / network failure. */
  | "network";

export class ActivityLogOperationError extends Error {
  constructor(public code: ActivityLogErrorCode, message: string) {
    super(message);
    this.name = "ActivityLogOperationError";
  }
}

// ─── Row mapper ─────────────────────────────────────────────────────

function mapActivityLog(raw: RawActivityLog): ActivityLog {
  return {
    id: raw.id,
    category: raw.category,
    description: raw.description,
    by: raw.actor_name ?? "System",
    createdAt: raw.created_at,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function readMessage(err: ApiError, fallback: string): string {
  const body = err.body as { message?: string } | null;
  return body?.message ?? fallback;
}

function classifyError(err: ApiError, fallback: string): ActivityLogOperationError {
  const message = readMessage(err, fallback);
  switch (err.status) {
    case 403:
      return new ActivityLogOperationError("forbidden", message);
    case 401:
      return new ActivityLogOperationError("unauthenticated", message);
    default:
      return new ActivityLogOperationError("network", message);
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

// ─── Service ────────────────────────────────────────────────────────

/**
 * Fetch a paginated, server-filtered page of activity log entries.
 *
 * @throws {ActivityLogOperationError} 401/403/5xx
 */
export async function listForAdmin(params: {
  category?: string;
  search?: string;
  /** An exact Y-m-d from the date picker. Wins over dateRange if both are set. */
  date?: string;
  /** 'today' | 'last_7_days' | 'last_30_days' | 'all' — scopes by created_at server-side. */
  dateRange?: string;
  page?: number;
  perPage?: number;
  /** Cancels a stale request superseded by a newer search/page/filter change. */
  signal?: AbortSignal;
} = {}): Promise<ActivityLogPage> {
  const qs = buildQuery({
    category: params.category,
    search: params.search,
    date: params.date || undefined,
    // The exact date picker and the range dropdown are mutually exclusive in
    // the UI — only send the range when there's no specific date selected.
    date_range: !params.date && params.dateRange && params.dateRange !== "all" ? params.dateRange : undefined,
    page: params.page,
    per_page: params.perPage,
  });
  try {
    const response = await api.get<ApiResponseEnvelope<PaginatedEnvelope<RawActivityLog>>>(
      `/api/admin/activity-logs${qs}`,
      undefined,
      { signal: params.signal }
    );
    const p = response.data;
    return {
      items: (p?.data ?? []).map(mapActivityLog),
      page: p?.current_page ?? params.page ?? 1,
      lastPage: p?.last_page ?? 1,
      total: p?.total ?? 0,
    };
  } catch (err) {
    if (err instanceof RequestCancelledError) throw err;
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to load activity logs.");
    }
    throw new ActivityLogOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}
