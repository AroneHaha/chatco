"use client";

export type AppTheme = "dark" | "light";

export interface ThemeStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => AppTheme;
  set: (theme: AppTheme) => void;
}

/**
 * Per-device dark/light preference kept in localStorage, shared by
 * useSyncExternalStore subscribers. `current` is the in-memory copy: it keeps
 * the toggle working when storage is blocked (private mode), and every
 * subscriber reads the same value without re-parsing storage. Each app (commuter,
 * admin) gets its own store and key so one app's choice never changes the other.
 */
export function createThemeStore(storageKey: string): ThemeStore {
  let current: AppTheme | null = null;
  const listeners = new Set<() => void>();

  function readStored(): AppTheme {
    try {
      return window.localStorage.getItem(storageKey) === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      // Another tab changing the preference updates this one too.
      const onStorage = (event: StorageEvent) => {
        if (event.key !== storageKey) return;
        current = event.newValue === "light" ? "light" : "dark";
        listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot() {
      if (current === null) current = readStored();
      return current;
    },
    set(theme) {
      if (current === theme) return;
      current = theme;
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch {
        // Storage blocked — the in-memory value still applies for this session.
      }
      listeners.forEach(listener => listener());
    },
  };
}
