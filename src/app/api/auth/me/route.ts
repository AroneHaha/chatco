// src/app/api/auth/me/route.ts
//
// GET /api/auth/me
//
// Returns the currently authenticated user by reading the httpOnly
// chatco_session cookie server-side. The client-side auth context
// (src/contexts/auth-context.tsx) calls this on mount + on full-page
// navigations to restore the session — document.cookie cannot read an
// httpOnly cookie, so the client-side fallback alone is not enough.
//
// Response shape (200):
//   { user: { id, email, role }, profile?: CommuterProfile }
//
// The commuter profile is mirrored from the mock profiles in the auth
// context for the prototype phase. When the real user table lands, this
// becomes a DB lookup.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import type { CommuterProfile } from "@/types";

const MOCK_PROFILES: Record<string, { email: string; profile: CommuterProfile }> = {
  u_1: {
    email: "commuter@gmail.com",
    profile: {
      id: "c_001",
      firstName: "Arone",
      middleName: "Santos",
      surname: "Dela Cruz",
      birthdate: "2001-05-15",
      gender: "Male",
      email: "arone.delacruz@gmail.com",
      contactNumber: "09123456789",
      commuterType: "REGULAR",
      username: "arone_dc",
      languagePreference: "English",
      accountStatus: "ACTIVE",
      idImageUrl: null,
      verifiedAt: "2026-03-10T10:00:00Z",
      createdAt: "2026-03-10T10:00:00Z",
      updatedAt: "2026-03-10T10:00:00Z",
    },
  },
  a_1: {
    email: "admin@chatco.com",
    profile: {
      id: "a_001",
      firstName: "Admin",
      middleName: null,
      surname: "Chatco",
      birthdate: "1990-01-01",
      gender: "Prefer not to say",
      email: "admin@chatco.com",
      contactNumber: "09111111111",
      commuterType: "REGULAR",
      username: "admin",
      languagePreference: "English",
      accountStatus: "ACTIVE",
      idImageUrl: null,
      verifiedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  },
  c_1: {
    email: "conductor@chatco.com",
    profile: {
      id: "cond_001",
      firstName: "Pedro",
      middleName: null,
      surname: "Penduko",
      birthdate: "1985-06-20",
      gender: "Male",
      email: "conductor@chatco.com",
      contactNumber: "09222222222",
      commuterType: "REGULAR",
      username: "pedro_penduko",
      languagePreference: "English",
      accountStatus: "ACTIVE",
      idImageUrl: null,
      verifiedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  },
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const mock = MOCK_PROFILES[user.id];
  const email = mock?.email ?? `${user.id}@chatco.com`;

  return NextResponse.json({
    user: {
      id: user.id,
      email,
      role: user.role,
    },
    // Only commuters need the full profile on the client.
    profile: user.role === "COMMUTER" ? mock?.profile : undefined,
  });
}
