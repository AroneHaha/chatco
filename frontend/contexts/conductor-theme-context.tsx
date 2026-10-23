"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppThemeProvider } from "@/contexts/commuter-theme-context";
import { createThemeStore } from "@/lib/theme/theme-store";

/** Separate key from the commuter and admin apps, so each keeps its own choice. */
const store = createThemeStore("chatco:conductor-theme");

/**
 * Conductor pages whose content and chrome have `light:` styles. Light mode is
 * rolled out page by page, like the admin app: on every other route the whole
 * screen stays dark even when the conductor picked light, because its content
 * still uses white text that would vanish on a light background. Add a route
 * here once its page and the popovers opened from it are themed.
 */
const LIGHT_READY_ROUTES = new Set([
  "/conductor-dashboard",
  "/conductor-dashboard/end-of-day",
  "/conductor-dashboard/metrics",
  "/conductor-dashboard/conductor-settings",
  "/unit-verification",
]);

export function ConductorThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AppThemeProvider store={store} applyLight={LIGHT_READY_ROUTES.has(pathname)}>
      {children}
    </AppThemeProvider>
  );
}
