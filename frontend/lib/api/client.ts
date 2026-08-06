/**
 * API Client — Centralized fetch wrapper for Laravel + Supabase backend.
 *
 * Architecture:
 * ─────────────────────────────────────────────────────────────
 * - Laravel serves as the API gateway (sanctum auth, business logic)
 * - Supabase (Postgres) is the database behind Laravel's Eloquent models
 * - All API calls go through this client for consistent error handling,
 *   auth headers, and base URL configuration
 *
 * Usage:
 *   import { api } from "@/lib/api/client";
 *   const data = await api.get<CommuterProfile>("/api/commuter/profile");
 *   const result = await api.post<Transaction>("/api/transactions", payload);
 */

// ─── Configuration ───────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

/**
 * App API routes (`/api/...`) must stay same-origin so the Next.js route
 * handlers can read the httpOnly `chatco_session` cookie and proxy to Laravel's
 * versioned `/api/v1/...` endpoints. Pointing NEXT_PUBLIC_API_URL at Laravel
 * would otherwise make the browser call unversioned Laravel routes such as
 * `/api/lost-found`, which do not exist.
 */
function resolveRequestUrl(baseUrl: string, path: string): string {
  if (path.startsWith("/api/")) return path;
  return `${baseUrl}${path}`;
}

interface ApiConfig {
  baseUrl: string;
  credentials: RequestCredentials;
  defaultHeaders: Record<string, string>;
}

const defaultConfig: ApiConfig = {
  baseUrl: API_BASE_URL,
  credentials: "include", // Sanctum uses cookie-based auth
  defaultHeaders: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

// ─── Error Types ─────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Thrown when a request is aborted via an `AbortSignal` (e.g. a caller
 * cancelling a stale search/filter request superseded by a newer one).
 * Kept distinct from `NetworkError` so callers can tell "cancelled on
 * purpose" apart from "actually failed" and skip error-state updates for
 * the former.
 */
export class RequestCancelledError extends Error {
  constructor() {
    super("Request was cancelled");
    this.name = "RequestCancelledError";
  }
}

// ─── Response Types ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// ─── Client ──────────────────────────────────────────────────────────

class ApiClient {
  private config: ApiConfig;
  /** Guards against a burst of concurrent 401s each firing a redirect. */
  private sessionEndedHandled = false;

  constructor(config: ApiConfig = defaultConfig) {
    this.config = config;
  }

  /**
   * A 401 on an authenticated call means this device's token is gone — either
   * it expired, or a staff account signed in elsewhere and single-device
   * enforcement revoked it (AuthService::login). The cookie is httpOnly, so
   * clearing it requires the server route; then we land on /login rather than
   * leaving a dead session showing errors.
   *
   * Safe against the login screen: /api/auth/login and /api/auth/me use plain
   * fetch, not this client, so a wrong password (also a 401) never lands here.
   */
  private async handleSessionEnded(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.sessionEndedHandled) return;
    this.sessionEndedHandled = true;

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Best-effort — redirect regardless; middleware re-guards the route.
    }
    window.location.href = "/login?reason=session_ended";
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = resolveRequestUrl(this.config.baseUrl, path);

    const headers = {
      ...this.config.defaultHeaders,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: this.config.credentials,
      });

      // Handle non-JSON responses (e.g., 204 No Content)
      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();

      if (!response.ok) {
        // Fire-and-forget: callers still get the ApiError so their own error
        // handling runs, while the redirect proceeds in the background.
        if (response.status === 401) {
          void this.handleSessionEnded();
        }
        throw new ApiError(response.status, response.statusText, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new RequestCancelledError();
      }
      throw new NetworkError(
        error instanceof Error ? error.message : "Network request failed"
      );
    }
  }

  async get<T>(
    path: string,
    params?: Record<string, string>,
    options?: RequestInit
  ): Promise<T> {
    const searchParams = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return this.request<T>(`${path}${searchParams}`, options);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}

// ─── Singleton Export ────────────────────────────────────────────────

export const api = new ApiClient();

// ─── API Route Constants ─────────────────────────────────────────────
// Centralized route definitions — when Laravel is wired up,
// these are the endpoints the frontend will call.

export const API_ROUTES = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    user: "/api/user",
  },
  commuter: {
    profile: "/api/commuter/profile",
    updateProfile: "/api/commuter/profile",
    changePassword: "/api/commuter/change-password",
    paymentHistory: "/api/commuter/payments",
  },
  conductor: {
    profile: "/api/conductor/profile",
    startShift: "/api/conductor/shifts/start",
    endShift: "/api/conductor/shifts/end",
    transactions: (shiftId: string) => `/api/conductor/transactions?shift_id=${shiftId}`,
    saveTransaction: "/api/conductor/transactions",
    remittance: "/api/conductor/remittances",
    shiftLogs: "/api/conductor/shift-logs",
  },
  admin: {
    users: "/api/admin/users",
    vehicles: "/api/admin/vehicles",
    lostFound: "/api/admin/lost-found",
    monitoring: "/api/admin/monitoring",
    analytics: "/api/admin/analytics",
    settings: "/api/admin/settings",
  },
  payments: {
    create: "/api/payments/create",
    verify: (id: string) => `/api/payments/verify?id=${id}`,
  },
  feedback: {
    submit: "/api/feedback",
  },
  announcements: {
    list: "/api/announcements",
    markRead: (id: string) => `/api/announcements/${id}/read`,
    markAllRead: "/api/announcements/read-all",
  },
  lostFound: {
    list: "/api/lost-found",
    claim: (id: string) => `/api/lost-found/${id}/claim`,
  },
  rewards: {
    status: "/api/rewards/status",
    vouchers: "/api/rewards/vouchers",
  },
  sos: {
    alert: "/api/sos/alert",
  },
} as const;
