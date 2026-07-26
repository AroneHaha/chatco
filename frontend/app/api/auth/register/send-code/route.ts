import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/register/send-code
 * PUBLIC — no auth required. Proxies to Laravel POST /api/v1/auth/register/send-code.
 *
 * Body: { email: string, contact_number?: string }
 *
 * Mails a 6-digit code to the address the applicant entered on the sign-up
 * form's contact step. The backend's status passes through untouched:
 *   200 — code sent
 *   422 — address already registered, or the identity is in a rejection
 *         cooldown (field errors under `errors.email`)
 *   429 — a code was requested moments ago
 *   502 — the mail transport failed
 */
const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

export async function POST(request: NextRequest) {
  let body: { email?: string; contact_number?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_URL}${API_V1}/auth/register/send-code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: body.email, contact_number: body.contact_number }),
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
