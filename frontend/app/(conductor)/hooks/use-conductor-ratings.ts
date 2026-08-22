"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchActiveShift, getActiveShift } from "@/lib/conductor/services/shift.service";
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
      // fetchRatingsForShift only needs a shiftId, which the shift cache
      // already has for a returning conductor — start it alongside the
      // shift verification instead of waiting for that round trip first.
      const cachedShiftId = getActiveShift()?.shiftId ?? null;
      const [activeShift, cachedRatingsResult] = await Promise.all([
        fetchActiveShift(),
        cachedShiftId ? fetchRatingsForShift(cachedShiftId) : Promise.resolve(null),
      ]);

      if (!activeShift) {
        setShift(null);
        setRatings([]);
        setStatus("empty");
        return;
      }

      setShift(activeShift);

      // The cached shiftId usually matches the server's real active shift.
      // On the rare mismatch (shift changed between visits), the parallel
      // fetch above was for the wrong shift — fetch the right one instead.
      const { ratings: fetchedRatings, error: ratingsError } =
        cachedRatingsResult && activeShift.shiftId === cachedShiftId
          ? cachedRatingsResult
          : await fetchRatingsForShift(activeShift.shiftId);

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
