import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("chatco_session")?.value;

    if (token) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    }
  } catch {
    // Ignore — we still clear the cookies
  }

  const response = NextResponse.json({ success: true });

  // Clear both cookies
  response.cookies.set("chatco_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("chatco_role", "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}