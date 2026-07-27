/**
 * Admin user-management service (S5-T10).
 *
 * Calls Next.js proxy routes (which forward to Laravel with the httpOnly
 * `chatco_session` cookie) — never calls Laravel directly from the browser.
 * This keeps the Sanctum bearer token server-side only and avoids CORS.
 *
 *   GET    /api/admin/users              → list(filters)
 *   GET    /api/admin/users/{id}         → get(id)
 *   PUT    /api/admin/users/{id}         → update(id, data)
 *   DELETE /api/admin/users/{id}         → remove(id)
 *
 * Responsibilities:
 *   - Map snake_case Laravel envelopes → camelCase view-models the UI uses
 *   - Translate backend 422 validation errors into typed exceptions the
 *     UI can branch on (field-level errors for the edit modal)
 *   - Keep the page component free of API/transport concerns
 *
 * Mirrors the pattern established by lib/commuter/services/profile.service.ts
 * (S5-T9) and the admin vehicles proxy routes (S5-T4 frontend).
 */

// ─── Raw backend shapes ─────────────────────────────────────────────

/** Shape of a single user from AdminService::present(). */
interface RawUser {
  id: string;
  email: string;
  role: string;
  name: string;
  account_status: string | null;
  commuter_type: string | null;
  contact_number: string | null;
  verified_at: string | null;
  created_at: string | null;
}

/**
 * Laravel LengthAwarePaginator shape (the relevant fields).
 * The full paginator also has `links`, `path`, `from`, `to` etc. —
 * we only destructure what the UI needs.
 */
interface Paginator<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
}

// ─── Frontend view-model ────────────────────────────────────────────

export type UserRole = "ADMIN" | "CONDUCTOR" | "COMMUTER";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "APPROVED" | "PENDING" | "REJECTED";
export type CommuterType = "REGULAR" | "STUDENT" | "SENIOR" | "PWD";

/**
 * A user row in the admin management table.
 *
 * `id` is a UUID string (the backend uses UUID PKs). `status` is the
 * UI-friendly mapping of `account_status`:
 *   ACTIVE / APPROVED → "Active"
 *   SUSPENDED          → "Suspended"
 *   PENDING / REJECTED → passthrough (for the pending/rejected tabs)
 */
export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  /** Raw backend status — kept for the service layer to branch on. */
  accountStatus: AccountStatus | null;
  /** UI-friendly label for the table badge. */
  statusLabel: string;
  commuterType: CommuterType | null;
  /** UI-friendly commuter type label (e.g. "Senior Citizen" for SENIOR). */
  commuterTypeLabel: string;
  contactNumber: string | null;
  verifiedAt: string | null;
  createdAt: string | null;
}

/** Pagination metadata returned by the list endpoint. */
export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  total: number;
  lastPage: number;
  from: number | null;
  to: number | null;
}

/** Result of a list() call — the page + pagination metadata. */
export interface UserListResult {
  users: AdminUser[];
  pagination: PaginationMeta;
}

// ─── Filter input ───────────────────────────────────────────────────

export interface UserListFilters {
  role?: UserRole | "";
  search?: string;
  perPage?: number;
  page?: number;
  sort?: "recent" | "oldest" | "alphabetical";
  accountStatus?: "" | "ACTIVE" | "SUSPENDED";
}

// ─── Update input ───────────────────────────────────────────────────

/**
 * Fields the admin edit modal can send. All optional — the backend
 * UpdateUserRequest uses `sometimes` validation, so only sent fields
 * are updated. At least one field must be present (server-enforced).
 */
export interface UpdateUserInput {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  accountStatus?: "ACTIVE" | "SUSPENDED";
  contactNumber?: string;
}

// ─── Typed errors ───────────────────────────────────────────────────

/**
 * Thrown by update() / remove() on any non-success response.
 * Carries a stable `code` + optional `field` + `errors` map so the UI
 * can render field-specific messages next to the right input.
 */
export class UserOperationError extends Error {
  constructor(
    public code:
      | "validation"
      | "not_found"
      | "forbidden"
      | "unauthenticated"
      | "network",
    message: string,
    public field?: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "UserOperationError";
  }
}

// ─── Mapper ─────────────────────────────────────────────────────────

function mapCommuterTypeLabel(raw: string | null): string {
  if (!raw) return "—";
  switch (raw) {
    case "REGULAR": return "Regular";
    case "STUDENT": return "Student";
    case "SENIOR": return "Senior Citizen";
    case "PWD": return "PWD";
    default: return raw;
  }
}

function mapStatusLabel(raw: string | null): string {
  if (!raw) return "—";
  switch (raw) {
    case "ACTIVE":
    case "APPROVED":
      return "Active";
    case "SUSPENDED":
      return "Suspended";
    case "PENDING":
      return "Pending";
    case "REJECTED":
      return "Rejected";
    default:
      return raw;
  }
}

function mapUser(raw: RawUser): AdminUser {
  return {
    id: raw.id,
    email: raw.email,
    role: raw.role as UserRole,
    name: raw.name,
    accountStatus: (raw.account_status as AccountStatus | null) ?? null,
    statusLabel: mapStatusLabel(raw.account_status),
    commuterType: (raw.commuter_type as CommuterType | null) ?? null,
    commuterTypeLabel: mapCommuterTypeLabel(raw.commuter_type),
    contactNumber: raw.contact_number,
    verifiedAt: raw.verified_at,
    createdAt: raw.created_at,
  };
}

// ─── Service functions ──────────────────────────────────────────────

const API_BASE = "/api/admin/users";

function buildQueryString(filters: UserListFilters): string {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.search && filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.perPage) params.set("per_page", String(filters.perPage));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.accountStatus) params.set("account_status", filters.accountStatus);
  params.set("active_only", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Fetch a paginated, filterable list of users.
 *
 * @throws {UserOperationError} on 401 (unauthenticated) / 403 (forbidden) /
 *   502 (network). Never throws on empty results — returns `{ users: [],
 *   pagination: {...} }`.
 */
export async function list(filters: UserListFilters = {}): Promise<UserListResult> {
  const qs = buildQueryString(filters);
  const res = await fetch(`${API_BASE}${qs}`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw translateError(res.status, await safeMessage(res));
  }

  const json = await res.json();
  // The proxy forwards the Laravel paginator as `{ data: { paginator } }`.
  // The paginator itself has a `data` array of users.
  const paginator: Paginator<RawUser> | RawUser[] = json.data;

  // Defensive: the endpoint always returns a paginator, but handle a
  // bare array too (older mock or future shape change).
  if (Array.isArray(paginator)) {
    return {
      users: paginator.map(mapUser),
      pagination: {
        currentPage: 1,
        perPage: filters.perPage ?? paginator.length,
        total: paginator.length,
        lastPage: 1,
        from: paginator.length ? 1 : null,
        to: paginator.length,
      },
    };
  }

  return {
    users: (paginator.data ?? []).map(mapUser),
    pagination: {
      currentPage: paginator.current_page,
      perPage: paginator.per_page,
      total: paginator.total,
      lastPage: paginator.last_page,
      from: paginator.from,
      to: paginator.to,
    },
  };
}

/**
 * Fetch a single user by ID.
 *
 * @throws {UserOperationError} 404 / 401 / 403 / 502
 */
export async function get(id: string): Promise<AdminUser> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    throw translateError(res.status, await safeMessage(res));
  }

  const json = await res.json();
  return mapUser(json.data as RawUser);
}

/**
 * Update a user's editable fields.
 *
 * Maps camelCase frontend input → snake_case backend contract, then PUTs
 * to the proxy. On 422, throws a `UserOperationError` with `code:
 * "validation"` and the `errors` map so the edit modal can render
 * field-specific messages.
 *
 * @returns The updated user (fresh from the server).
 */
export async function update(id: string, input: UpdateUserInput): Promise<AdminUser> {
  const body: Record<string, unknown> = {};
  if (input.firstName !== undefined) body.first_name = input.firstName;
  if (input.middleName !== undefined) body.middle_name = input.middleName;
  if (input.lastName !== undefined) body.last_name = input.lastName;
  if (input.accountStatus !== undefined) body.account_status = input.accountStatus;
  if (input.contactNumber !== undefined) body.contact_number = input.contactNumber;

  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await safeMessage(res);
    if (res.status === 422) {
      const errorBody = await safeJson(res);
      throw new UserOperationError(
        "validation",
        message,
        undefined,
        errorBody?.errors ?? undefined
      );
    }
    throw translateError(res.status, message);
  }

  const json = await res.json();
  return mapUser(json.data as RawUser);
}

/**
 * Soft-delete a user. They are locked out of auth but their financial
 * history is preserved.
 *
 * @throws {UserOperationError} 404 / 422 (self-delete / last-admin guard) /
 *   401 / 403 / 502. On 422 the `errors` map is populated so the UI can
 *   surface the specific guard message ("You cannot delete your own
 *   account.").
 */
export async function remove(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const message = await safeMessage(res);
    if (res.status === 422) {
      const errorBody = await safeJson(res);
      throw new UserOperationError(
        "validation",
        message,
        undefined,
        errorBody?.errors ?? undefined
      );
    }
    throw translateError(res.status, message);
  }
}

// ─── Error helpers ──────────────────────────────────────────────────

async function safeMessage(res: Response): Promise<string> {
  try {
    const body = await res.clone().json();
    return body?.message ?? `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}

async function safeJson(res: Response): Promise<{ message?: string; errors?: Record<string, string[]> } | null> {
  try {
    return await res.clone().json();
  } catch {
    return null;
  }
}

function translateError(status: number, message: string): UserOperationError {
  switch (status) {
    case 401:
      return new UserOperationError("unauthenticated", "Your session has expired. Please log in again.");
    case 403:
      return new UserOperationError("forbidden", message || "You do not have permission to perform this action.");
    case 404:
      return new UserOperationError("not_found", message || "User not found.");
    case 502:
      return new UserOperationError("network", "Unable to reach the server. Please try again.");
    default:
      return new UserOperationError("network", message || "An unexpected error occurred.");
  }
}
