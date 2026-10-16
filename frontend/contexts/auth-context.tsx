"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "@/lib/conductor/persistence/device.store";
import { cacheShift, clearShift } from "@/lib/conductor/persistence/shift.store";
import { getRoleDashboard, type AuthUser, type CommuterProfile, type UserRole } from "@/types";

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

export class LoginError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "LoginError";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [commuterProfile, setCommuterProfile] =
    useState<CommuterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authRequestId = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++authRequestId.current;
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await response.json();
          if (requestId !== authRequestId.current) return;
          const authUser: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            name: data.user.name,
          };
          setUser(authUser);

          if (authUser.role === "COMMUTER" && data.profile) {
            setCommuterProfile(data.profile);
          } else {
            setCommuterProfile(null);
          }

          setIsLoading(false);
          return;
        }
      }
    } catch {
      // API not available
    }

    if (requestId !== authRequestId.current) return;
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
        throw new LoginError(data.message || "Login failed.", data.code);
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
      };

      if (authUser.role === "CONDUCTOR") {
        if (data.activeShift) cacheShift(data.activeShift);
        else clearShift();
      }

      // An older /me response must not overwrite a completed login.
      authRequestId.current++;
      setUser(authUser);
      setCommuterProfile(null);
      setIsLoading(false);

      // Fetch full profile after login (sets commuterProfile if commuter)
      if (authUser.role === "COMMUTER") {
        refresh();
      }

      return data.redirectPath;
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    authRequestId.current++;
    // Clear the server cookies before the landing page and login modal reload.
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      // Leave the protected view even if the logout endpoint is unavailable.
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

    window.location.replace("/login");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Refresh starts the initial auth request and manages its loading state.
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

/** Suppress protected UI and its providers until the shared session is known.
 * Server middleware and Laravel enforce access independently of this guard.
 */
export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const allowed = !isLoading && user?.role === role;
  useEffect(() => {
    if (!isLoading && !allowed) {
      window.location.replace(getRoleDashboard(user?.role) ?? "/login");
    }
  }, [isLoading, allowed, user?.role]);

  return allowed ? children : null;
}
