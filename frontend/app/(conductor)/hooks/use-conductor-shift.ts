"use client";

import { useCallback, useEffect, useState } from "react";
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

export function useConductorShift(options?: { pollMs?: number }): UseConductorShiftResult {
  const [shift, setShift] = useState<ConductorShift | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [status, setStatus] = useState<UseConductorShiftResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Shift status changes ~twice a day (start / end), so polling every 3s
    // was wasteful and pushed conductor-read toward its limit. 15s keeps the
    // elapsed timer fresh enough while leaving plenty of rate headroom.
    const interval = window.setInterval(refresh, options?.pollMs ?? 15000);
    return () => window.clearInterval(interval);
  }, [options?.pollMs, refresh]);

  return { shift, elapsed, status, error, refresh };
}
