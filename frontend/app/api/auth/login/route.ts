import { NextResponse } from "next/server";
import { clientIpHeaders } from "@/lib/auth/server/client-ip";
import { mapShiftLog } from "@/lib/conductor/server/mappers";
import type { ConductorShift } from "@/lib/conductor/persistence/shift.store";
import { getRoleDashboard } from "@/types/user";

const API_URL = process.env.API_URL || "http://localhost:8000";

/**
 * POST /api/auth/login
 *
 * Proxies to Laravel `POST /api/v1/auth/login` (Sanctum token auth). On
 * success it issues the `chatco_session` httpOnly cookie that every
 * downstream route reads to attach the bearer token.
 */
export async function POST(request: Request) {
  let body: {
    email?: string;
    password?: string;
    device_id?: string;
    device_type?: "WEB" | "MOBILE";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }
  const { email, password, device_id, device_type } = body;

  // ─── Try Laravel first ─────────────────────────────────────────────
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...clientIpHeaders(request) },
      body: JSON.stringify({ login: email, password, device_id, device_type }),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data?.data?.token) {
      const { id, email: userEmail, role, name, token, must_change_password, profile_picture_url } = data.data;
      let activeShift: ConductorShift | null = null;

      if (role === "CONDUCTOR") {
        try {
          const shiftResponse = await fetch(`${API_URL}/api/v1/conductor/shift`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            cache: "no-store",
          });
          const shiftData = await shiftResponse.json();
          if (!shiftResponse.ok || !("data" in shiftData)) {
            throw new Error("Unable to check active shift.");
          }
          activeShift = shiftData.data ? mapShiftLog(shiftData.data) : null;
        } catch {
          return NextResponse.json(
            { message: "Unable to check your active shift. Please try signing in again." },
            { status: 502 }
          );
        }
      }

      return issueSession({ id, email: userEmail, role, name, token, profile_picture_url }, activeShift, Boolean(must_change_password));
    }

    if (res.status === 503 && data?.code === "MAINTENANCE") {
      return NextResponse.json(
        { code: "MAINTENANCE", message: data.message },
        { status: 503 }
      );
    }

    // Laravel responded but rejected the credentials (401/422) — surface that.
    if (res.status !== 0 && res.status < 500) {
      return NextResponse.json(
        { message: data?.message || "Invalid credentials." },
        { status: res.status }
      );
    }
    // 5xx — backend error.
    return NextResponse.json(
      { message: data?.message || "The authentication service is unavailable. Please try again." },
      { status: 502 }
    );
  } catch {
    // Network error — Laravel unreachable.
    return NextResponse.json(
      { message: "Unable to reach the authentication service. Please try again." },
      { status: 502 }
    );
  }
}

function issueSession(
  user: { id: string; email: string; role: string; name: string; token: string; profile_picture_url?: string | null },
  activeShift: ConductorShift | null,
  mustChangePassword: boolean
) {
  // A default-password account gets the session cookie (the setup page needs
  // it) but is sent to Set New Password instead of its dashboard.
  const redirectPath = mustChangePassword ? "/set-new-password" : getRoleDashboard(user.role);
  if (!redirectPath) {
    return NextResponse.json({ message: "Unable to sign in." }, { status: 403 });
  }

  const response = NextResponse.json({
    user,
    redirectPath,
    ...(user.role === "CONDUCTOR" ? { activeShift } : {}),
  });

  // httpOnly cookie — bearer token (JavaScript CANNOT read this).
  response.cookies.set("chatco_session", user.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  // Readable role hint; page and API authorization use the verified session.
  response.cookies.set("chatco_role", user.role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
