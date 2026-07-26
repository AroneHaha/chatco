import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/forgot-password
 * PUBLIC — no auth required. Proxies to Laravel POST /api/v1/auth/forgot-password.
 *
 * Body: { email: string }
 *
 * Passes the backend's status through untouched: 200 when a code was sent,
 * 404 when no account holds that email, 502 when SMTP delivery failed. The
 * page renders `message` verbatim, so the wording lives in the backend.
 */
const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}${API_V1}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: body.email }),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to reach the server. Please try again later." },
      { status: 502 }
    );
  }
}
