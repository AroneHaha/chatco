import { NextResponse } from "next/server";
import { loginInMemory } from "@/lib/shared/server/inmemory-backend";

const API_URL = process.env.API_URL || "http://localhost:8000";

/**
 * POST /api/auth/login
 *
 * PRIMARY: proxies to Laravel `POST /api/v1/auth/login` (Sanctum token auth).
 * FALLBACK: when Laravel is unreachable (sandbox preview has no PHP runtime),
 * authenticates against the in-memory user store so the full commuter →
 * conductor feedback loop stays demoable. The in-memory path issues a token
 * and sets the same `chatco_session` httpOnly cookie the Laravel path uses,
 * so every downstream route (which reads that cookie) works unchanged.
 *
 * Demo credentials (in-memory):
 *   commuter@chatco.ph  / commuter123   → /dashboard
 *   conductor@chatco.ph / conductor123  → /unit-verification
 *   admin@chatco.ph     / admin123      → /admin-dashboard
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }
  const { email, password } = body;

  // ─── Try Laravel first ─────────────────────────────────────────────
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ login: email, password }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.data?.token) {
      const { id, email: userEmail, role, name, token } = data.data;
      return issueSession({ id, email: userEmail, role, name, token });
    }

    // Laravel responded but rejected the credentials (401/422) — surface that.
    if (res.status !== 0 && res.status < 500) {
      return NextResponse.json(
        { message: data?.message || "Invalid credentials." },
        { status: res.status }
      );
    }
    // 5xx / unreachable → fall through to in-memory fallback.
  } catch {
    // Network error (Laravel unreachable) → fall through to in-memory fallback.
  }

  // ─── In-memory fallback ────────────────────────────────────────────
  const result = loginInMemory(email ?? "", password ?? "");
  if (!result) {
    return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
  }

  const { user, token } = result;
  return issueSession({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    token,
  });
}

function issueSession(user: { id: string; email: string; role: string; name: string; token: string }) {
  const redirectPath =
    user.role === "ADMIN"
      ? "/admin-dashboard"
      : user.role === "CONDUCTOR"
        ? "/unit-verification"
        : "/dashboard";

  const response = NextResponse.json({ user, redirectPath });

  // httpOnly cookie — bearer token (JavaScript CANNOT read this).
  response.cookies.set("chatco_session", user.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  // Readable role cookie — the client uses this for route guards / nav.
  response.cookies.set("chatco_role", user.role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
