import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/register
 * PUBLIC — no auth required. Proxies to Laravel POST /api/v1/auth/register.
 *
 * Forwards multipart form data (including the ID image file) directly to
 * Laravel. Does NOT use the standard proxyToLaravel() because that
 * stringifies the body as JSON — we need to forward the raw FormData so
 * the file upload reaches Laravel intact.
 *
 * On success → 201 with { id, email, role, account_status, applied_type }
 * On 422     → validation errors forwarded to the frontend
 */
const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

export async function POST(request: NextRequest) {
  try {
    // Read the FormData from the browser request (multipart).
    const formData = await request.formData();

    // Forward directly to Laravel — fetch handles multipart boundary
    // automatically when given a FormData body.
    const res = await fetch(`${API_URL}${API_V1}/auth/register`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 422) {
        return NextResponse.json(
          { message: data.message ?? "Validation failed.", errors: data.errors ?? {} },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { message: data.message ?? "Failed to register." },
        { status: res.status }
      );
    }

    return NextResponse.json({ data: data.data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Unable to reach the backend service. Please try again." },
      { status: 502 }
    );
  }
}
