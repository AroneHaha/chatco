import { NextRequest } from "next/server";
import { jsonError, jsonData, jsonValidationError } from "@/lib/conductor/server/response";

/**
 * GET /api/admin/registrations
 * Lists PENDING commuter accounts awaiting admin review.
 */
export async function GET(request: NextRequest) {
  // Reuse the shared proxy for the read path (JSON-only).
  const { proxyToLaravel } = await import("@/lib/conductor/server/proxy");
  const result = await proxyToLaravel(request, "/admin/registrations", { method: "GET" });
  if (!result.ok) return jsonError(result.message ?? "Failed to load registrations.", result.status);
  return jsonData(result.data);
}

/**
 * POST /api/admin/registrations
 * Create a PENDING commuter account on behalf of a commuter who registered
 * onsite (e.g. at a terminal kiosk). The admin fills the form + uploads a
 * valid ID image; the account is created with account_status=PENDING.
 *
 * This route handles MULTIPART FORM DATA (not JSON) because of the ID image
 * file. The shared proxyToLaravel() helper only supports JSON bodies, so we
 * forward the multipart request manually here — preserving the original
 * Content-Type boundary so Laravel's $request->file('id_image') works.
 *
 * The auth token is read from the httpOnly chatco_session cookie (same as
 * the shared proxy) and sent as a Bearer header.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return jsonError("Unauthorized. Admin session required.", 401);
  }

  const API_URL = process.env.API_URL || "http://localhost:8000";
  const API_V1 = "/api/v1";

  // Read the raw multipart body + its Content-Type header (includes the
  // boundary string Laravel needs to parse the file). We must NOT set
  // Content-Type manually — fetch() will do it for us when we pass a
  // FormData instance, OR we forward the request's own header verbatim.
  const contentType = request.headers.get("content-type") ?? "";
  const isMultipart = contentType.startsWith("multipart/form-data");

  try {
    let body: BodyInit;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    if (isMultipart) {
      // Forward the multipart body verbatim — preserve the original boundary.
      headers["Content-Type"] = contentType;
      body = await request.arrayBuffer();
    } else {
      // Allow JSON too (defensive — some callers might send JSON without a file).
      headers["Content-Type"] = "application/json";
      body = await request.text();
    }

    const res = await fetch(`${API_URL}${API_V1}/admin/registrations`, {
      method: "POST",
      headers,
      body,
    });

    const responseBody = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 422 && responseBody?.errors) {
        return jsonValidationError(
          responseBody.message ?? "Validation failed.",
          responseBody.errors,
          422
        );
      }
      return jsonError(
        responseBody?.message ?? `Failed to create registration (HTTP ${res.status}).`,
        res.status
      );
    }

    return jsonData(responseBody?.data ?? null, 201);
  } catch {
    return jsonError("Unable to reach the backend service. Please try again.", 502);
  }
}
