import { NextRequest } from "next/server";
import { jsonData, jsonError } from "@/lib/conductor/server/response";

/**
 * Laravel backend base URL. Same env var used by the auth route handlers
 * (`/api/auth/login`, `/api/auth/me`) and the conductor profile proxy.
 */
const API_URL = process.env.API_URL || "http://localhost:8000";

/**
 * The Laravel API version prefix applied in `bootstrap/app.php` (`apiPrefix`).
 * Every conductor endpoint lives under `/api/v1/conductor/*`.
 */
const API_V1 = "/api/v1";

export interface ProxyResult {
  ok: boolean;
  status: number;
  /** The `data` field from Laravel's `{ success, data, … }` envelope (or null). */
  data: unknown;
  /** The `message` field from Laravel's error envelope (if not ok). */
  message: string | null;
  /**
   * The `errors` field from Laravel's 422 validation response.
   * Shape: `{ field_name: ["Error message 1", "Error message 2"] }`.
   * Null for non-validation errors.
   */
  errors: Record<string, string[]> | null;
}

/**
 * Forward a conductor request to the Laravel backend, carrying the Sanctum
 * bearer token from the httpOnly `chatco_session` cookie.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Sanctum token is stored in an httpOnly cookie that client-side
 * JavaScript cannot read. The Next.js API route is the only place that
 * can read the cookie and attach it as an `Authorization: Bearer` header
 * for the Laravel backend. Laravel's `auth:sanctum` + `role:CONDUCTOR`
 * middleware validates the token and role on every request — the proxy
 * does NOT re-validate; it just forwards.
 *
 * The proxy returns Laravel's `data` envelope field so each route handler
 * can map it to the frontend's expected shape.
 */
export async function proxyToLaravel(
  request: NextRequest,
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  } = {}
): Promise<ProxyResult> {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return { ok: false, status: 401, data: null, message: "Unauthorized. Conductor session required.", errors: null };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_URL}${API_V1}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: null,
        message: body?.message ?? "Request failed.",
        errors: body?.errors ?? null,
      };
    }

    return { ok: true, status: res.status, data: body?.data ?? null, message: body?.message ?? null, errors: null };
  } catch {
    return {
      ok: false,
      status: 502,
      data: null,
      message: "Unable to reach the backend service. Please try again.",
      errors: null,
    };
  }
}

/**
 * Convenience: proxy a GET request and return a NextResponse directly.
 * Use when the route handler does not need to map the response shape.
 */
export async function proxyGet(request: NextRequest, path: string) {
  const result = await proxyToLaravel(request, path, { method: "GET" });
  if (!result.ok) {
    return jsonError(result.message ?? "Request failed.", result.status);
  }
  return jsonData(result.data);
}
