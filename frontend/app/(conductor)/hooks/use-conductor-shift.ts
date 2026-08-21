"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  fetchActiveShift,
  getActiveShift,
  getElapsed,
  type ConductorShift,
} from "@/lib/conductor/services/shift.service";

interface UseConductorShiftResult {
  shift: ConductorShift | null;
  elapsed: string;
  status: "loading" | "success" | "error" | "empty";
  error: string | null;
  refresh: () => Promise<void>;
}

const ConductorShiftContext = createContext<UseConductorShiftResult | null>(null);

function useSharedConductorShift(): UseConductorShiftResult {
  const [shift, setShift] = useState<ConductorShift | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [status, setStatus] = useState<UseConductorShiftResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const request = (async () => {
      try {
        const activeShift = await fetchActiveShift();
        setShift(activeShift);
        setElapsed(activeShift ? getElapsed(activeShift) : "");
        setStatus(activeShift ? "success" : "empty");
        setError(null);
      } catch (err) {
        const localShift = getActiveShift();
        setShift(localShift);
        setElapsed(localShift ? getElapsed(localShift) : "");
        setStatus(localShift ? "success" : "error");
        setError(
          err instanceof Error ? err.message : "Unable to load active shift."
        );
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    // Shift status changes ~twice a day (start / end), so polling every 3s
    // was wasteful and pushed conductor-read toward its limit. 15s keeps the
    // elapsed timer fresh enough while leaving plenty of rate headroom.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const refreshNow = () => void refresh();

    window.addEventListener("focus", refreshNow);
    window.addEventListener("online", refreshNow);
    window.addEventListener("conductor:device-changed", refreshNow);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("online", refreshNow);
      window.removeEventListener("conductor:device-changed", refreshNow);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  return { shift, elapsed, status, error, refresh };
}

export function ConductorShiftProvider({ children }: { children: ReactNode }) {
  const value = useSharedConductorShift();
  return createElement(ConductorShiftContext.Provider, { value }, children);
}

export function useConductorShift(): UseConductorShiftResult {
  const value = useContext(ConductorShiftContext);
  if (!value) {
    throw new Error("useConductorShift must be used inside ConductorShiftProvider.");
  }
  return value;
}
