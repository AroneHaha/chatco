"use client";

/**
 * Auth Context — Single Source of Truth for the authenticated user.
 *
 * Architecture (Laravel + Supabase):
 * ─────────────────────────────────────────────────────────────
 * - Login: POST /api/auth/login → Laravel Sanctum issues session cookie
 * - User:  GET /api/user → Returns authenticated AuthUser + role
 * - Logout: POST /api/auth/logout → Invalidates Sanctum session
 * - Commuter profile: GET /api/commuter/profile → CommuterProfile from Supabase
 *
 * This context replaces ALL hardcoded `"c_001"` commuter IDs
 * and `mockUser` objects throughout the codebase.
 *
 * Usage:
 *   const { user, commuterProfile, isLoading } = useAuth();
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  AuthUser,
  CommuterProfile,
  UserRole,
} from "@/types/user";

// ─── Auth State ──────────────────────────────────────────────────────

interface AuthState {
  /** The authenticated user (from Sanctum) */
  user: AuthUser | null;
  /** The commuter's full profile (from Supabase) — null for admin/conductor */
  commuterProfile: CommuterProfile | null;
  /** Whether auth state is still loading */
  isLoading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
}

interface AuthActions {
  /** Login with email + password */
  login: (email: string, password: string) => Promise<{ redirectPath: string }>;
  /** Logout and clear session */
  logout: () => void;
  /** Refresh the user + profile data */
  refresh: () => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Mock Data (temporary — replaced when Laravel backend is live) ───

const MOCK_AUTH_USER: AuthUser = {
  id: "c_001",
  email: "arone.delacruz@gmail.com",
  role: "COMMUTER",
};

const MOCK_COMMUTER_PROFILE: CommuterProfile = {
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
  accountStatus: "DISCOUNT_REJECTED",
  idImageUrl: "/mock-id.jpg",
  verifiedAt: null,
  createdAt: "2026-03-10T10:00:00Z",
  appliedType: "STUDENT",
};

// ─── Helpers ─────────────────────────────────────────────────────────

function getDashboardPath(role: UserRole): string {
  switch (role) {
    case "COMMUTER":
      return "/dashboard";
    case "ADMIN":
      return "/admin-dashboard";
    case "CONDUCTOR":
      return "/unit-verification";
    default:
      return "/login";
  }
}

// ─── Provider ────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [commuterProfile, setCommuterProfile] = useState<CommuterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user on mount (checks session cookie)
  useEffect(() => {
    async function initAuth() {
      try {
        // ── FUTURE: Real API calls ──
        // const res = await fetch("/api/user", { credentials: "include" });
        // if (res.ok) {
        //   const data = await res.json();
        //   setUser(data.user);
        //   if (data.user.role === "COMMUTER") {
        //     const profileRes = await fetch("/api/commuter/profile", { credentials: "include" });
        //     if (profileRes.ok) setCommuterProfile(await profileRes.json());
        //   }
        // }

        // ── MOCK: Read from localStorage for prototype ──
        const stored = localStorage.getItem("chatco_user");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setUser(parsed.user || MOCK_AUTH_USER);
            setCommuterProfile(parsed.profile || MOCK_COMMUTER_PROFILE);
          } catch {
            setUser(MOCK_AUTH_USER);
            setCommuterProfile(MOCK_COMMUTER_PROFILE);
          }
        } else {
          // Default to mock user for development
          setUser(MOCK_AUTH_USER);
          setCommuterProfile(MOCK_COMMUTER_PROFILE);
        }
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ redirectPath: string }> => {
      setIsLoading(true);

      try {
        // ── FUTURE: Real API call ──
        // const res = await fetch("/api/auth/login", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({ email, password }),
        //   credentials: "include",
        // });
        // const data = await res.json();
        // if (!res.ok) throw new Error(data.message || "Login failed");
        // setUser(data.user);
        // if (data.user.role === "COMMUTER") setCommuterProfile(data.profile);
        // localStorage.setItem("chatco_user", JSON.stringify({ user: data.user, profile: data.profile }));
        // return { redirectPath: getDashboardPath(data.user.role) };

        // ── MOCK: Simulate login ──
        await new Promise((r) => setTimeout(r, 500));
        const mockUser: AuthUser = { id: "c_001", email, role: "COMMUTER" };
        const mockProfile = { ...MOCK_COMMUTER_PROFILE, email };
        setUser(mockUser);
        setCommuterProfile(mockProfile);
        localStorage.setItem(
          "chatco_user",
          JSON.stringify({ user: mockUser, profile: mockProfile })
        );
        return { redirectPath: getDashboardPath(mockUser.role) };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    // ── FUTURE: Real API call ──
    // fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(() => { ... });

    setUser(null);
    setCommuterProfile(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("chatco_user");
      localStorage.removeItem("conductor_active_shift");
      localStorage.removeItem("conductor_transactions");
      localStorage.removeItem("remittance_history");
      window.location.href = "/login";
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // ── FUTURE: Re-fetch /api/user ──
      await new Promise((r) => setTimeout(r, 300));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        commuterProfile,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
