"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchActiveHails, type ConductorHailRequest } from "@/lib/conductor/services/hails.service";

interface UseConductorHailsResult {
  hails: ConductorHailRequest[];
  status: "loading" | "success" | "error" | "empty";
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConductorHails(pollMs = 4000): UseConductorHailsResult {
  const [hails, setHails] = useState<ConductorHailRequest[]>([]);
  const [status, setStatus] = useState<UseConductorHailsResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  const doRefresh = useCallback(async () => {
    try {
      const { hails: fetchedHails, error: fetchError } = await fetchActiveHails();
      setHails(fetchedHails);
      setError(fetchError);
      setStatus(
        fetchError ? "error" : fetchedHails.length > 0 ? "success" : "empty"
      );
    } catch (err) {
      setHails([]);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to load hail requests.");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      if (controller.signal.aborted) return;
      try {
        const { hails: fetchedHails, error: fetchError } = await fetchActiveHails();
        if (controller.signal.aborted) return;
        setHails(fetchedHails);
        setError(fetchError);
        setStatus(
          fetchError ? "error" : fetchedHails.length > 0 ? "success" : "empty"
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        setHails([]);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unable to load hail requests.");
      }
    };

    run();
    const interval = window.setInterval(run, pollMs);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [pollMs]);

  return { hails, status, error, refresh: doRefresh };
}
