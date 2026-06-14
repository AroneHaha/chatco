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
    const controller = new AbortController();
    const doRefresh = async () => {
      if (controller.signal.aborted) return;
      try {
        const activeShift = await fetchActiveShift();
        if (controller.signal.aborted) return;
        setShift(activeShift);
        setElapsed(activeShift ? getElapsed(activeShift) : "");
        setStatus(activeShift ? "success" : "empty");
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        const localShift = getActiveShift();
        setShift(localShift);
        setElapsed(localShift ? getElapsed(localShift) : "");
        setStatus(localShift ? "success" : "error");
        setError(
          err instanceof Error ? err.message : "Unable to load active shift."
        );
      }
    };

    doRefresh();
    const interval = window.setInterval(doRefresh, options?.pollMs ?? 3000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [options?.pollMs]);

  return { shift, elapsed, status, error, refresh };
}
