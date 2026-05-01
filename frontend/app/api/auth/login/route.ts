// frontend/app/api/auth/login/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // --- TEMPORARY MOCK VALIDATION ---
    // Later: replace with real database + bcrypt
    const MOCK_USERS = [
      { id: "u_1", email: "commuter@gmail.com", username: "commuter", password: "commuter", role: "COMMUTER" },
      { id: "a_1", email: "admin@chatco.com", username: "admin", password: "admin", role: "ADMIN" },
      { id: "c_1", email: "conductor@chatco.com", username: "conductor", password: "conductor", role: "CONDUCTOR" },
    ];

    const user = MOCK_USERS.find(
      (u) =>
        (u.email === email || u.username === email) &&
        u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials. Please try again." },
        { status: 401 }
      );
    }

    // --- Session token (placeholder) ---
    // Later: replace with real JWT
    const sessionToken = `chatco_${user.id}_${user.role}_${Date.now()}`;

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role },
      redirectPath:
        user.role === "ADMIN"
          ? "/admin-dashboard"
          : user.role === "CONDUCTOR"
          ? "/unit-verification"
          : "/dashboard",
    });

    // Set httpOnly cookie — JavaScript CANNOT read this
    response.cookies.set("chatco_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}