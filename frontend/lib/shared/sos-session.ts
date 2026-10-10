export interface SosSession {
  id: string;
  startedAt: number;
  hotline?: string | null;
}

type SosRole = "commuter" | "conductor";

function sessionKey(role: SosRole, userId: string) {
  return `chatco:sos:${role}:${userId}`;
}

export function readSosSession(role: SosRole, userId?: string): SosSession | null {
  if (!userId || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(role, userId));
    if (!raw) return null;
    const session = JSON.parse(raw) as SosSession;
    if (!session || typeof session.id !== "string" || !session.id || !Number.isFinite(session.startedAt)) return null;
    return {
      id: session.id,
      startedAt: session.startedAt,
      hotline: typeof session.hotline === "string" ? session.hotline : null,
    };
  } catch {
    return null;
  }
}

export function saveSosSession(role: SosRole, userId: string | undefined, session: SosSession) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(sessionKey(role, userId), JSON.stringify(session));
  } catch {
    // Closing the screen must still work when browser storage is unavailable.
  }
}

export function clearSosSession(role: SosRole, userId?: string) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(sessionKey(role, userId));
  } catch {
    // Browser storage may be unavailable.
  }
}
