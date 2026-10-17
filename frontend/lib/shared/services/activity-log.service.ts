/**
 * Admin Activity Logs service.
 *
 * Read-only audit trail — admin actions, commuter account edits and system
 * events are written server-side (ActivityLogService::record()); this
 * service only reads them.
 *
 *   GET /api/admin/activity-logs        → listForAdmin({ category?, search?, date?, dateRange?, actorRole?, page?, perPage? })
 *   GET /api/admin/activity-logs/export → exportForAdmin({ same filters }) — every matching row, capped server-side
 *
 * Mirrors the pattern established by lib/shared/services/announcement.service.ts
 * (raw→view-model mapper, typed error class, buildQuery helper, AbortSignal
 * support for stale-request cancellation) — see that file for the fuller
 * write-up of the conventions being followed here.
 */

import { api, ApiError, RequestCancelledError } from "@/lib/api/client";

// ─── Raw backend shape ──────────────────────────────────────────────

interface RawActivityChange {
  field: string;
  from: string | null;
  to: string | null;
}

interface RawActivityLog {
  id: string;
  category: string;
  description: string;
  /** Null when no person did it (renders as "System"). */
  actor_name: string | null;
  /** ADMIN | COMMUTER | CONDUCTOR | SYSTEM; null on rows whose actor was later deleted. */
  actor_role: string | null;
  /** Field-level before/after values for edits; null or [] when not applicable. */
  changes: RawActivityChange[] | null;
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

export type ActivityActorRole = "ADMIN" | "COMMUTER" | "CONDUCTOR" | "SYSTEM";

export interface ActivityChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface ActivityLog {
  id: string;
  category: string;
  description: string;
  /** The actor's display name, or "System" for an automatic event. */
  by: string;
  /** Who "by" is; null when unknown (actor deleted before roles were recorded). */
  role: ActivityActorRole | null;
  changes: ActivityChange[];
  /** ISO timestamp (created_at). */
  createdAt: string;
}

export interface ActivityLogFilters {
  category?: string;
  search?: string;
  /** An exact Y-m-d from the date picker. Wins over dateRange if both are set. */
  date?: string;
  /** 'today' | 'last_7_days' | 'last_30_days' | 'all' — scopes by created_at server-side. */
  dateRange?: string;
  actorRole?: ActivityActorRole;
}

export interface ActivityLogExport {
  items: ActivityLog[];
  /** Every matching row, which can exceed items.length when the server cap applies. */
  total: number;
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

const ACTOR_ROLES: readonly string[] = ["ADMIN", "COMMUTER", "CONDUCTOR", "SYSTEM"];

function mapActivityLog(raw: RawActivityLog): ActivityLog {
  return {
    id: raw.id,
    category: raw.category,
    description: raw.description,
    by: raw.actor_name ?? "System",
    role: raw.actor_role && ACTOR_ROLES.includes(raw.actor_role) ? (raw.actor_role as ActivityActorRole) : null,
    changes: Array.isArray(raw.changes) ? raw.changes : [],
    createdAt: raw.created_at,
  };
}

/** The filter query shared by the list and the export. */
function filterQuery(params: ActivityLogFilters) {
  return {
    category: params.category,
    search: params.search,
    date: params.date || undefined,
    // The exact date picker and the range dropdown are mutually exclusive in
    // the UI — only send the range when there's no specific date selected.
    date_range: !params.date && params.dateRange && params.dateRange !== "all" ? params.dateRange : undefined,
    actor_role: params.actorRole,
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
export async function listForAdmin(params: ActivityLogFilters & {
  page?: number;
  perPage?: number;
  /** Cancels a stale request superseded by a newer search/page/filter change. */
  signal?: AbortSignal;
} = {}): Promise<ActivityLogPage> {
  const qs = buildQuery({
    ...filterQuery(params),
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

/**
 * Every entry matching the filters, newest first, for a report export. The
 * server caps the rows (ActivityLogService::EXPORT_LIMIT); `total` is the full
 * match count so the caller can say when the export was cut short.
 *
 * @throws {ActivityLogOperationError} 401/403/5xx
 */
export async function exportForAdmin(params: ActivityLogFilters = {}): Promise<ActivityLogExport> {
  const qs = buildQuery(filterQuery(params));
  try {
    const response = await api.get<ApiResponseEnvelope<{ data: RawActivityLog[]; total: number }>>(
      `/api/admin/activity-logs/export${qs}`
    );
    const items = (response.data?.data ?? []).map(mapActivityLog);
    return { items, total: response.data?.total ?? items.length };
  } catch (err) {
    if (err instanceof ApiError) {
      throw classifyError(err, "Unable to export activity logs.");
    }
    throw new ActivityLogOperationError(
      "network",
      err instanceof Error ? err.message : "Unable to reach the backend service."
    );
  }
}
