import { NextRequest } from "next/server";
import { jsonData, jsonError, jsonValidationError } from "@/lib/conductor/server/response";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";

/**
 * GET /api/conductor/profile
 *
 * Proxies the conductor profile from Laravel `GET /api/v1/conductor/profile`.
 */
const API_URL = process.env.API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) {
    return jsonError("Unauthorized. Conductor session required.", 401);
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/conductor/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (res.ok) {
      const body = await res.json();
      return jsonData(body?.data ?? null);
    }
    // Laravel rejected the token.
    return jsonError("Unauthorized. Conductor session required.", 401);
  } catch {
    // Laravel unreachable.
    return jsonError("Unable to reach the backend service. Please try again.", 502);
  }
}

/** POST /api/conductor/profile/photo — authenticated multipart profile photo upload. */
export async function POST(request: NextRequest) {
  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    return jsonError("Invalid photo upload.", 400);
  }

  const result = await proxyToLaravel(request, "/conductor/profile/photo", {
    method: "POST",
    body,
  });

  if (!result.ok) {
    if (result.status === 422) {
      return jsonValidationError(result.message ?? "The photo is invalid.", result.errors, result.status);
    }
    return jsonError(result.message ?? "Unable to upload profile photo.", result.status);
  }

  return jsonData(result.data);
}
