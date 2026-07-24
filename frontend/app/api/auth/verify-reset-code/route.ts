import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/verify-reset-code
 * PUBLIC — no auth required. Proxies to Laravel POST /api/v1/auth/verify-reset-code.
 *
 * Body: { email: string, code: string }
 *
 * On valid code → 200. On wrong/expired/locked code → 400 with a message.
 */
const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

export async function POST(request: NextRequest) {
  let body: { email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}${API_V1}/auth/verify-reset-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: body.email, code: body.code }),
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
