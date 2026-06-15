"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthUser, CommuterProfile, UserRole } from "@/types";

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
      console.log("LOGIN START", { email });

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log("LOGIN STATUS", response.status);

      const data = await response.json();
      console.log("LOGIN DATA", data);

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
      };

      setUser(authUser);
      console.log("LOGIN USER SET, redirecting to", data.redirectPath);

      return data.redirectPath;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
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
    }
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