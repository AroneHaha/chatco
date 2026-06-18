import { NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ login: email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Invalid credentials." },
        { status: res.status }
      );
    }

    const { id, email: userEmail, role, name, token } = data.data;

    const redirectPath =
      role === "ADMIN"
        ? "/admin-dashboard"
        : role === "CONDUCTOR"
        ? "/unit-verification"
        : "/dashboard";

    const response = NextResponse.json({
      user: { id, email: userEmail, role, name },
      redirectPath,
    });

    // httpOnly cookie — Sanctum token (JavaScript CANNOT read this)
    response.cookies.set("chatco_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

  
    response.cookies.set("chatco_role", role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "Unable to connect to the server." },
      { status: 500 }
    );
  }
}