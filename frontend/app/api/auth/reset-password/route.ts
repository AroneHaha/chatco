import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/reset-password
 * PUBLIC — no auth required. Proxies to Laravel POST /api/v1/auth/reset-password.
 *
 * Body: { token: string, email: string, password: string, password_confirmation: string }
 *
 * On success → 200 with success message.
 * On invalid/expired token → 400 with error message.
 */
const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

export async function POST(request: NextRequest) {
  let body: {
    token?: string;
    email?: string;
    password?: string;
    password_confirmation?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}${API_V1}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: body.token,
        email: body.email,
        password: body.password,
        password_confirmation: body.password_confirmation,
      }),
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
