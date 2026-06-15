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

  const refresh = useCallback(async () => {
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
    void refresh();
    const interval = window.setInterval(refresh, pollMs);
    return () => window.clearInterval(interval);
  }, [pollMs, refresh]);

  return { hails, status, error, refresh };
}
