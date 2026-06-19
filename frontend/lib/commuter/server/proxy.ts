/**
 * Commuter-scoped server proxy to Laravel backend.
 *
 * Reads the `chatco_session` cookie (set by /api/auth/login on successful
 * login) and forwards it as an `Authorization: Bearer` header to Laravel.
 *
 * This mirrors the inline pattern used in /api/auth/login/route.ts and
 * /api/auth/me/route.ts, abstracted into a reusable utility so any
 * commuter Next.js route handler can proxy to Laravel in one line:
 *
 *   import { proxyToLaravel } from "@/lib/commuter/server/proxy";
 *   export async function POST(request: NextRequest) {
 *     return proxyToLaravel(request, "/api/commuter/hail", {
 *       method: "POST",
 *       body: await request.text(),
 *     });
 *   }
 *
 * Auth model:
 *   - Browser cookie `chatco_session` holds the Sanctum bearer token
 *   - This proxy reads that cookie and injects `Authorization: Bearer`
 *   - Laravel validates the token via Sanctum middleware
 *   - Route-level `role:COMMUTER` middleware enforces role checks
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ─── Configuration ────────────────────────────────────────────────────

/**
 * Laravel backend base URL (no trailing slash).
 * Falls back to localhost:8000 for local dev.
 */
export const API_URL = process.env.API_URL || "http://localhost:8000";

/**
 * API version prefix. The codebase currently uses `/api/` (no /v1),
 * but this constant is exported for future migration to `/api/v1/...`.
 * Existing endpoints: /api/commuter/hail, /api/conductor/hails, etc.
 *
 * To enable /v1 prefix, set API_V1 = "/api/v1" and update path callers
 * to omit the /api prefix. For now this is a documentation-only constant.
 */
export const API_V1 = "/api/v1";

// ─── Types ────────────────────────────────────────────────────────────

export interface ProxyOptions {
  method?: string;
  body?: string | null;
  headers?: Record<string, string>;
  /**
   * When true, returns the raw Response object instead of parsing JSON.
   * Useful for endpoints that return 204 No Content or non-JSON bodies.
   */
  raw?: boolean;
}

export interface ProxyResult {
  status: number;
  body: unknown;
}

// ─── Session Extraction ──────────────────────────────────────────────

/**
 * Read the Sanctum bearer token from the chatco_session cookie.
 * Returns null if the cookie is absent or empty.
 */
export function getCommuterToken(request: NextRequest): string | null {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token || token.trim() === "") return null;
  return token;
}

// ─── Unauthorized Response ───────────────────────────────────────────

export function unauthorizedResponse() {
  return NextResponse.json(
    { message: "Unauthenticated. Commuter session required." },
    { status: 401 }
  );
}

// ─── Main Proxy Function ─────────────────────────────────────────────

/**
 * Proxy a Next.js route handler request to the Laravel backend.
 *
 * @param request  The incoming NextRequest (used to read the auth cookie)
 * @param path     The Laravel API path (e.g., "/api/commuter/hail")
 * @param options  Optional method, body, headers
 *
 * @returns NextResponse with the Laravel response body and status code.
 *          If no auth cookie is present, returns 401 immediately.
 *
 * @example
 *   // app/api/commuter/hail/route.ts
 *   import { proxyToLaravel } from "@/lib/commuter/server/proxy";
 *
 *   export async function POST(request: NextRequest) {
 *     return proxyToLaravel(request, "/api/commuter/hail", {
 *       method: "POST",
 *       body: await request.text(),
 *     });
 *   }
 */
export async function proxyToLaravel(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const token = getCommuterToken(request);
  if (!token) {
    return unauthorizedResponse();
  }

  const url = `${API_URL}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...options.headers,
  };

  // Only set Content-Type if there's a body (avoids 411 Length Required
  // on Laravel side for GET/DELETE without body)
  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const laravelResponse = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ?? undefined,
    });

    // Handle non-JSON responses (e.g., 204 No Content)
    if (laravelResponse.status === 204 || options.raw) {
      return new NextResponse(null, {
        status: laravelResponse.status,
        headers: laravelResponse.headers,
      });
    }

    // Parse JSON — if Laravel returned non-JSON (rare error case),
    // fall back to text so the client gets SOMETHING useful
    const contentType = laravelResponse.headers.get("content-type") || "";
    let body: unknown;
    if (contentType.includes("application/json")) {
      body = await laravelResponse.json();
    } else {
      body = await laravelResponse.text();
    }

    return NextResponse.json(body, {
      status: laravelResponse.status,
    });
  } catch (error) {
    // Network error / Laravel unreachable
    return NextResponse.json(
      {
        success: false,
        message: "Unable to connect to the server.",
        data: null,
        errors: null,
        meta: null,
      },
      { status: 502 }
    );
  }
}
