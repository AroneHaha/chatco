import type { NextRequest } from "next/server";
import { jsonError } from "@/lib/conductor/server/response";

export interface ConductorSession {
  userId: string;
  role: string;
  email?: string;
  name?: string;
}

const CONDUCTOR_ACCOUNTS: Record<
  string,
  { email: string; name: string }
> = {
  c_1: { email: "conductor@chatco.com", name: "Pedro Penduko" },
};

function parseSessionToken(token: string): ConductorSession | null {
  const parts = token.split(":");
  if (parts.length < 3 || parts[0] !== "chatco") return null;
  return { userId: parts[1], role: parts[2] };
}

export function getConductorSession(
  request: NextRequest
): ConductorSession | null {
  const token = request.cookies.get("chatco_session")?.value;
  if (!token) return null;

  const session = parseSessionToken(token);
  if (!session || session.role !== "CONDUCTOR") return null;

  const account = CONDUCTOR_ACCOUNTS[session.userId];
  if (!account) return session;

  return {
    ...session,
    email: account.email,
    name: account.name,
  };
}

export function unauthorizedResponse() {
  return jsonError("Unauthorized. Conductor session required.", 401);
}
