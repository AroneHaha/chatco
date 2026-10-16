"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { createThemeStore, type AppTheme } from "@/lib/theme/theme-store";

/** Separate key from the commuter app, so each app keeps its own choice. */
const store = createThemeStore("chatco:admin-theme");

/**
 * Admin pages whose content has `admin-light:` styles. Light mode is rolled
 * out page by page: every other page keeps its dark background even while the
 * shell is light, because its content still uses white text that would vanish
 * on a light background. Add a route here once its page and modals are themed.
 */
const LIGHT_READY_ROUTES = new Set(["/admin-dashboard", "/remittance", "/receipts", "/monitoring", "/vehicles", "/lost-found", "/announcements", "/users"]);

export function isAdminLightReady(pathname: string): boolean {
  return LIGHT_READY_ROUTES.has(pathname);
}

const AdminThemeContext = createContext<AppTheme>("dark");

/**
 * Holds the admin appearance. Unlike the commuter app it does NOT set an
 * attribute on <html>: admin light styles use the scoped `admin-light:`
 * variant (globals.css), which only applies inside an element carrying
 * `data-admin-theme="light"`. The shell sets that attribute on its own chrome,
 * and on page content only for routes in LIGHT_READY_ROUTES.
 */
export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(store.subscribe, store.getSnapshot, () => "dark" as const);
  return <AdminThemeContext.Provider value={theme}>{children}</AdminThemeContext.Provider>;
}

export function useAdminTheme(): [AppTheme, (theme: AppTheme) => void] {
  return [useContext(AdminThemeContext), store.set];
}
