import { NextRequest, NextResponse } from "next/server";
import { resolveSessionInMemory } from "@/lib/shared/server/inmemory-backend";

const API_URL = process.env.API_URL || "http://localhost:8000";

/**
 * GET /api/auth/me
 *
 * PRIMARY: proxies to Laravel `GET /api/v1/user` (Sanctum) and returns the
 * authenticated user + commuter profile.
 * FALLBACK: when Laravel is unreachable, resolves the `chatco_session` cookie
 * against the in-memory session store so the client's auth context keeps
 * working in the sandbox preview (no PHP runtime).
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
    // Laravel rejected the token — fall through to in-memory.
  } catch {
    // Laravel unreachable — fall through to in-memory.
  }

  // ─── In-memory fallback ────────────────────────────────────────────
  const user = resolveSessionInMemory(token);
  if (!user) {
    return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
    profile: user.profile
      ? {
          id: user.id,
          firstName: user.profile.firstName,
          middleName: null,
          surname: user.profile.surname,
          birthdate: null,
          gender: null,
          email: user.email,
          contactNumber: user.profile.contactNumber,
          commuterType: user.profile.commuterType,
          appliedType: undefined,
          username: undefined,
          languagePreference: "English",
          accountStatus: user.profile.accountStatus,
          idImageUrl: null,
          verifiedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: undefined,
        }
      : null,
  });
}
