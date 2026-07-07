import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || "http://localhost:8000";

/**
 * GET /api/auth/me
 *
 * Proxies to Laravel `GET /api/v1/user` (Sanctum) and returns the
 * authenticated user + commuter profile.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("chatco_session")?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  // ─── Try Laravel first ─────────────────────────────────────────────
  try {
    const res = await fetch(`${API_URL}/api/v1/user`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      const backend = data.data;
      const profile = backend?.profile
        ? {
            id: backend.profile.id ?? backend.user.id,
            firstName: backend.profile.first_name,
            middleName: backend.profile.middle_name ?? null,
            surname: backend.profile.surname ?? backend.profile.last_name,
            birthdate: backend.profile.birthdate ?? backend.profile.birthday,
            gender: backend.profile.gender ?? null,
            email: backend.profile.email ?? backend.user.email,
            contactNumber: backend.profile.contact_number ?? null,
            commuterType: backend.profile.commuter_type ?? "REGULAR",
            appliedType: backend.profile.applied_type ?? undefined,
            username: backend.profile.username ?? backend.profile.generated_username,
            languagePreference: backend.profile.language_preference ?? "English",
            accountStatus: backend.profile.account_status ?? "ACTIVE",
            idImageUrl: backend.profile.id_image_url ?? null,
            verifiedAt: backend.profile.verified_at ?? null,
            createdAt: backend.profile.created_at ?? new Date().toISOString(),
            updatedAt: backend.profile.updated_at ?? undefined,
          }
        : null;
      return NextResponse.json({ user: backend.user, profile });
    }
    // Laravel rejected the token.
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  } catch {
    // Laravel unreachable.
    return NextResponse.json(
      { message: "Unable to reach the backend service. Please try again." },
      { status: 502 }
    );
  }
}
