"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useSyncExternalStore, useState, type ReactNode } from "react";
import { createThemeStore, type AppTheme, type ThemeStore } from "@/lib/theme/theme-store";

export type CommuterTheme = AppTheme;

/** Appearance is a per-device preference, so it lives in localStorage rather
 * than on the commuter's account. */
const store = createThemeStore("chatco:commuter-theme");

export function setCommuterTheme(theme: CommuterTheme) {
  store.set(theme);
}

/**
 * `theme` is what's on screen; `preference` is the saved choice. They differ
 * only in the conductor app, where pages without `light:` styles yet stay
 * dark (see ConductorThemeProvider).
 */
type AppThemeValue = {
  theme: AppTheme;
  preference: AppTheme;
  setPreference: (theme: AppTheme) => void;
};

const AppThemeContext = createContext<AppThemeValue | null>(null);

/**
 * Applies an app's appearance by setting `data-theme` on <html>, which
 * drives the `light:` Tailwind variant (globals.css). It sits on <html> rather
 * than the layout's own div so portaled dialogs inherit it, and it's removed
 * on unmount so the landing page and the admin app never see it. The UI is
 * dark-first: unthemed pieces simply stay dark until they're given `light:`
 * styles. Shared by the commuter and conductor apps, each with its own store.
 */
export function AppThemeProvider({
  store: themeStore,
  applyLight = true,
  children,
}: {
  store: ThemeStore;
  /** False keeps the screen dark while still reading/writing the preference. */
  applyLight?: boolean;
  children: ReactNode;
}) {
  const preference = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, () => "dark" as const);
  const theme: AppTheme = applyLight ? preference : "dark";

  // Layout effect so the attribute is in place before the first paint —
  // no dark-to-light flash when a light-mode user opens the app.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  const value = useMemo(() => ({ theme, preference, setPreference: themeStore.set }), [theme, preference, themeStore]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function CommuterThemeProvider({ children }: { children: ReactNode }) {
  return <AppThemeProvider store={store}>{children}</AppThemeProvider>;
}

/**
 * The active appearance, for the few places a `light:` class can't reach
 * (inline styles such as PopoverTail's fill). Dark outside a provider.
 */
export function useCommuterTheme(): CommuterTheme {
  return useContext(AppThemeContext)?.theme ?? "dark";
}

/**
 * State for an appearance toggle. Inside the commuter or conductor app it
 * reads and writes that app's saved preference; anywhere else it falls back
 * to preview-only local state.
 */
export function useLightModeToggle(): [boolean, (light: boolean) => void] {
  const context = useContext(AppThemeContext);
  const [previewLight, setPreviewLight] = useState(false);
  if (context === null) return [previewLight, setPreviewLight];
  return [context.preference === "light", light => context.setPreference(light ? "light" : "dark")];
}
