"use client";

// contexts/auth-context.tsx
// Canonical authentication context for the Chatco application.
//
// BACKEND-PROOFING:
// - Reads user from /api/auth/me (Laravel Sanctum) or falls back to
//   the session cookie payload for the prototype phase.
// - Does NOT trust client-side localStorage for role claims.
// - Properly handles COMMUTER / ADMIN / CONDUCTOR roles from server.
// - 401 responses trigger automatic redirect to /login.
//
// IMPORTANT: This is the SINGLE SOURCE OF TRUTH for auth state.
// Do NOT read auth info from localStorage directly elsewhere.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthUser, CommuterProfile, UserRole } from "@/types";
import { api } from "@/lib/api/client";
import { AUTH } from "@/lib/api/endpoints";

// ─── Context Shape ────────────────────────────────────────────────────

interface AuthContextValue {
  /** The authenticated user (from server). null = not logged in. */
  user: AuthUser | null;
  /** Full commuter profile — only populated for COMMUTER role. */
  commuterProfile: CommuterProfile | null;
  /** True while the initial auth check is in progress. */
  isLoading: boolean;
  /** Shortcut: true when user is non-null. */
  isAuthenticated: boolean;
  /** Login with email + password. Returns redirect path based on role. */
  login: (email: string, password: string) => Promise<string>;
  /** Logout — clears server session + client state. */
  logout: () => Promise<void>;
  /** Force-refresh the user from /api/user. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Mock User Fallback ──────────────────────────────────────────────
// During the prototype phase (no real backend yet), we derive the user
// from the chatco_session cookie that the login API route sets.
// When the real Laravel backend is integrated, this fallback is unnecessary.

const MOCK_PROFILES: Record<
  string,
  { user: AuthUser; profile: CommuterProfile }
> = {
  u_1: {
    user: { id: "u_1", email: "commuter@gmail.com", role: "COMMUTER" },
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
    user: { id: "a_1", email: "admin@chatco.com", role: "ADMIN" },
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
    },
  },
  c_1: {
    user: { id: "c_1", email: "conductor@chatco.com", role: "CONDUCTOR" },
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
    },
  },
};

/**
 * Parse the prototype session cookie to get user info.
 * Cookie format: "chatco:{id}:{role}:{timestamp}:{hmac}"
 * The HMAC is verified by middleware, so if we reach this point the cookie is valid.
 */
function parseSessionCookie(): { id: string; role: UserRole } | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)chatco_session=([^;]+)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  const parts = token.split(":");
  if (parts.length !== 5 || parts[0] !== "chatco") return null;
  const [, id, role] = parts;
  if (!["COMMUTER", "ADMIN", "CONDUCTOR"].includes(role)) return null;
  return { id, role: role as UserRole };
}

// ─── Provider Component ───────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [commuterProfile, setCommuterProfile] =
    useState<CommuterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch current user from server or cookie ──
  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      // Try the real backend endpoint first (Laravel Sanctum /api/user)
      // api.get<T>() returns T directly (not wrapped in { data: T })
      const result = await api.get<AuthUser>(AUTH.ME);

      if (result) {
        setUser(result);

        // If commuter, fetch profile
        if (result.role === "COMMUTER") {
          const profileResult = await api.get<CommuterProfile>(
            `${AUTH.ME.replace("/user", "")}/commuter-profile/${result.id}`
          );
          if (profileResult) {
            setCommuterProfile(profileResult);
          }
        }
      } else {
        // Fallback: parse session cookie (prototype phase)
        const parsed = parseSessionCookie();
        if (parsed) {
          const mock = MOCK_PROFILES[parsed.id];
          if (mock) {
            setUser(mock.user);
            if (parsed.role === "COMMUTER") {
              setCommuterProfile(mock.profile);
            }
          }
        } else {
          setUser(null);
          setCommuterProfile(null);
        }
      }
    } catch {
      // Fallback: parse session cookie (prototype phase)
      const parsed = parseSessionCookie();
      if (parsed) {
        const mock = MOCK_PROFILES[parsed.id];
        if (mock) {
          setUser(mock.user);
          if (parsed.role === "COMMUTER") {
            setCommuterProfile(mock.profile);
          }
        }
      } else {
        setUser(null);
        setCommuterProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Login ──
  const login = useCallback(
    async (email: string, password: string): Promise<string> => {
      // Use the Next.js API route for now (sets httpOnly cookie).
      // When Laravel is integrated, this will call AUTH.LOGIN directly.
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      // The login route returns: { user: { id, email, role }, redirectPath }
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
      };

      setUser(authUser);

      // Load mock profile for prototype
      const mock = MOCK_PROFILES[authUser.id];
      if (mock && authUser.role === "COMMUTER") {
        setCommuterProfile(mock.profile);
      }

      return data.redirectPath;
    },
    []
  );

  // ── Logout ──
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Clear client state regardless of API success
      setUser(null);
      setCommuterProfile(null);

      // Clear any leftover client-side storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("chatco_user");
        localStorage.removeItem("chatco_payment_history");
        localStorage.removeItem("chatco_refund_requests");
        localStorage.removeItem("conductor_active_shift");
        localStorage.removeItem("conductor_transactions");
        localStorage.removeItem("remittance_history");
      }

      window.location.href = "/login";
    }
  }, []);

  // ── Initial auth check on mount ──
  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: AuthContextValue = {
    user,
    commuterProfile,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────

/**
 * Access the current auth state.
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
