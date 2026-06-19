import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/conductor/server/response";

export interface ConductorSession {
  userId: string;
  role: string;
  email?: string;
  name?: string;
}

function parseLegacyToken(token: string): ConductorSession | null {
  const parts = token.split(":");
  if (parts.length < 3 || parts[0] !== "chatco") return null;
  return { userId: parts[1], role: parts[2] };
}

export function getConductorSession(
  request: NextRequest
): ConductorSession | null {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) return null;

  const legacy = parseLegacyToken(token);
  if (legacy) {
    if (legacy.role !== "CONDUCTOR") return null;
    return legacy;
  }

  const role = request.cookies.get("chatco_role")?.value;
  if (role !== "CONDUCTOR") return null;

  const tokenId = token.split("|")[0] || "sanctum_user";

  return {
    userId: tokenId,
    role: "CONDUCTOR",
  };
}

export function unauthorizedResponse() {
  return jsonError("Unauthorized. Conductor session required.", 401);
}
