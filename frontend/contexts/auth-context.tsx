"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "@/lib/conductor/persistence/device.store";
import type { AuthUser, CommuterProfile } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  commuterProfile: CommuterProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [commuterProfile, setCommuterProfile] =
    useState<CommuterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await response.json();
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
          };
          setUser(authUser);

          if (authUser.role === "COMMUTER" && data.profile) {
            setCommuterProfile(data.profile);
          }

          setIsLoading(false);
          return;
        }
      }
    } catch {
      // API not available
    }

    setUser(null);
    setCommuterProfile(null);
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<string> => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          device_id: getConductorDeviceId(),
          device_type: CONDUCTOR_DEVICE_TYPE,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
      };

      setUser(authUser);

      // Fetch full profile after login (sets commuterProfile if commuter)
      if (authUser.role === "COMMUTER") {
        refresh();
      }

      return data.redirectPath;
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    // Fire the server-side revoke in the background instead of awaiting it —
    // the Next.js route (app/api/auth/logout/route.ts) already clears the
    // httpOnly session cookie unconditionally and ignores failures from its
    // own Laravel revocation call, so nothing below needs to wait on or
    // branch on the outcome. sendBeacon (not fetch) because the immediate
    // redirect below starts unloading this page right after — a fetch can
    // get cancelled mid-flight by that navigation, while a beacon is
    // guaranteed by the browser to still be sent.
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/auth/logout");
    } else {
      // Older/uncommon browsers without sendBeacon — best-effort fallback,
      // not awaited so it can't delay the redirect either.
      void fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    }

    setUser(null);
    setCommuterProfile(null);

    if (typeof window !== "undefined") {
      localStorage.removeItem("chatco_user");
      localStorage.removeItem("chatco_payment_history");
      localStorage.removeItem("conductor_active_shift");
      localStorage.removeItem("conductor_transactions");
      localStorage.removeItem("remittance_history");
    }

    window.location.href = "/login";
  }, []);

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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
