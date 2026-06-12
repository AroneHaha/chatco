"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchActiveShift } from "@/lib/conductor/services/shift.service";
import {
  calculateMetrics,
  fetchRatingsForShift,
  type ConductorRating,
  type RatingMetrics,
} from "@/lib/conductor/services/ratings.service";
import type { ConductorShift } from "@/lib/conductor/services/shift.service";

interface UseConductorRatingsResult {
  shift: ConductorShift | null;
  ratings: ConductorRating[];
  metrics: RatingMetrics;
  status: "loading" | "success" | "error" | "empty";
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConductorRatings(): UseConductorRatingsResult {
  const [shift, setShift] = useState<ConductorShift | null>(null);
  const [ratings, setRatings] = useState<ConductorRating[]>([]);
  const [status, setStatus] = useState<UseConductorRatingsResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const activeShift = await fetchActiveShift();
      if (!activeShift) {
        setShift(null);
        setRatings([]);
        setStatus("empty");
        return;
      }

      setShift(activeShift);
      const { ratings: fetchedRatings, error: ratingsError } =
        await fetchRatingsForShift(activeShift.shiftId);

      setRatings(fetchedRatings);
      if (ratingsError) {
        setError(ratingsError);
        setStatus("error");
        return;
      }

      setStatus(fetchedRatings.length > 0 ? "success" : "empty");
    } catch (err) {
      setShift(null);
      setRatings([]);
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unable to load ratings.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    shift,
    ratings,
    metrics: calculateMetrics(ratings),
    status,
    error,
    refresh,
  };
}
