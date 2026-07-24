import { NextResponse } from "next/server";

/**
 * GET /api/system-status
 * PUBLIC — no auth. Proxies to Laravel GET /api/v1/system-status so client
 * components (the commuter + conductor app shells) can check maintenance mode.
 */
const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}${API_V1}/system-status`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    // Fail open — never lock users out because the status check failed.
    return NextResponse.json(
      { success: true, data: { maintenance_mode: false, maintenance_message: "" } },
      { status: 200 }
    );
  }
}
