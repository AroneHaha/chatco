import { NextResponse } from "next/server";

/**
 * GET /api/faqs
 * PUBLIC — no auth. Proxies to Laravel GET /api/v1/faqs, which returns the
 * ACTIVE FAQ items (question, answer, category, display_order) that power the
 * landing-page FAQ chat bubble. Admins manage this content at
 * /settings/faq-management.
 */
const API_URL = process.env.API_URL || "http://localhost:8000";
const API_V1 = "/api/v1";

export async function GET() {
  try {
    const res = await fetch(`${API_URL}${API_V1}/faqs`, {
      method: "GET",
      headers: { Accept: "application/json" },
      // FAQs change rarely; let the landing page get a fresh copy each load
      // rather than a stale build-time cache.
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, data: [], message: "Unable to reach the server." },
      { status: 502 }
    );
  }
}
