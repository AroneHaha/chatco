"use client";

import { createContext, useContext, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createThemeStore, type AppTheme } from "@/lib/theme/theme-store";

export type CommuterTheme = AppTheme;

/** Appearance is a per-device preference, so it lives in localStorage rather
 * than on the commuter's account. */
const store = createThemeStore("chatco:commuter-theme");
const { subscribe, getSnapshot } = store;

export function setCommuterTheme(theme: CommuterTheme) {
  store.set(theme);
}

const CommuterThemeContext = createContext<CommuterTheme | null>(null);

/**
 * Applies the commuter appearance by setting `data-theme` on <html>, which
 * drives the `light:` Tailwind variant (globals.css). It sits on <html> rather
 * than the layout's own div so portaled dialogs inherit it, and it's removed
 * on unmount so the landing page and the admin/conductor apps never see it.
 * The commuter UI is dark-first: unthemed pieces simply stay dark until
 * they're given `light:` styles.
 */
export function CommuterThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "dark" as const);

  // Layout effect so the attribute is in place before the first paint —
  // no dark-to-light flash when a light-mode commuter opens the app.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  return <CommuterThemeContext.Provider value={theme}>{children}</CommuterThemeContext.Provider>;
}

/**
 * The active commuter appearance, for the few places a `light:` class can't
 * reach (inline styles such as PopoverTail's fill). Dark outside the provider.
 */
export function useCommuterTheme(): CommuterTheme {
  return useContext(CommuterThemeContext) ?? "dark";
}

/**
 * State for an appearance toggle. Inside the commuter app it reads and writes
 * the real preference; anywhere else (the conductor app shares the same toggle
 * components) it falls back to the previous preview-only local state.
 */
export function useLightModeToggle(): [boolean, (light: boolean) => void] {
  const theme = useContext(CommuterThemeContext);
  const [previewLight, setPreviewLight] = useState(false);
  if (theme === null) return [previewLight, setPreviewLight];
  return [theme === "light", light => setCommuterTheme(light ? "light" : "dark")];
}
