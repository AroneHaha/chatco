// lib/api.ts
//
// Centralized API client for admin BFF routes.
// All calls go through Next.js BFF routes (app/api/admin/[...path]/route.ts),
// which read the Sanctum token from the httpOnly `chatco_session` cookie.
//
// IMPORTANT: Laravel returns snake_case keys by default.
// This client automatically transforms all response keys to camelCase
// so frontend code can use camelCase consistently.

// ── Snake_case → camelCase key transformer ───────────────────────────

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function transformKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item)) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[snakeToCamel(key)] = transformKeys(value);
    }
    return result as T;
  }
  return obj as T;
}

// ── Response types ──────────────────────────────────────────────────────

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiError extends Error {
  status: number;
  body: ApiErrorResponse;

  constructor(status: number, body: ApiErrorResponse) {
    super(body.message || `API Error ${status}`);
    this.status = status;
    this.body = body;
  }
}

// ── Generic fetch wrapper ──────────────────────────────────────────────
//
// Calls BFF routes at /api/admin/... which proxy to Laravel.
// The BFF route handles adding the Authorization header from cookies.
// Response keys are automatically transformed from snake_case to camelCase.

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, json as ApiErrorResponse);
  }

  // The backend wraps responses in { success, data, message, meta }
  // We transform the data payload keys from snake_case to camelCase
  // and return the data directly for convenience.
  if (json.success && json.data !== undefined) {
    return transformKeys<T>(json.data);
  }

  // Fallback: return raw json if structure is unexpected (still transform keys)
  return transformKeys<T>(json);
}

// ── Convenience methods ────────────────────────────────────────────────
//
// All endpoints are relative to the BFF route (e.g., /api/admin/dashboard)

export function apiGet<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'GET' });
}

export function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}