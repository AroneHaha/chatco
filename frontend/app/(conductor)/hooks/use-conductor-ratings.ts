"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  calculateMetrics,
  fetchAllTimeRatingMetrics,
  type RatingMetrics,
} from "@/lib/conductor/services/ratings.service";

interface UseConductorRatingsResult {
  metrics: RatingMetrics;
  status: "loading" | "success" | "error" | "empty";
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConductorRatings(): UseConductorRatingsResult {
  const [metrics, setMetrics] = useState<RatingMetrics>(() => calculateMetrics([]));
  const [status, setStatus] = useState<UseConductorRatingsResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const load = useCallback(() => {
    const version = ++requestVersion.current;
    return fetchAllTimeRatingMetrics().then((result) => {
      if (version !== requestVersion.current) return;
      setMetrics(result.metrics);
      setError(result.error);
      setStatus(result.error ? "error" : result.metrics.totalRatings > 0 ? "success" : "empty");
    }).catch(() => {
      if (version !== requestVersion.current) return;
      setMetrics(calculateMetrics([]));
      setStatus("error");
      setError("Unable to load ratings. Please try again.");
    });
  }, []);

  useEffect(() => {
    const versionState = requestVersion;
    void load();
    return () => { versionState.current++; };
  }, [load]);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    await load();
  }, [load]);

  return { metrics, status, error, refresh };
}
