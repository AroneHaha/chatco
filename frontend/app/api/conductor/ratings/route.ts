import { NextRequest } from "next/server";
import { proxyToLaravel } from "@/lib/conductor/server/proxy";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import type { ConductorRating, RatingMetrics } from "@/lib/conductor/services/ratings.service";

interface RatingSummary {
  average_rating: number;
  total_count: number;
  distribution: Record<string, number>;
}

/** Feedback row shape returned by Laravel `GET /conductor/ratings`. */
interface FeedbackRow {
  id: string;
  shift_id: string;
  vehicle_id: string;
  driver_id: string;
  conductor_id: string;
  commuter_id: string;
  commuter_name: string | null;
  rating: number;
  category: string | null;
  comment: string | null;
  conductor_rating: number | null;
  conductor_category: string | null;
  conductor_comment: string | null;
  created_at: string;
}

/**
 * GET /api/conductor/ratings?shift_id=…
 * GET /api/conductor/ratings?scope=all_time returns numeric RatingMetrics only.
 *
 * Proxies to Laravel `GET /api/v1/conductor/ratings` (role:CONDUCTOR), which
 * returns the feedback rows for the shift (scoped to the auth conductor).
 *
 * Each commuter feedback row is stamped to BOTH the driver and the conductor
 * (the crew snapshot captured when the shift started), so we emit TWO
 * `ConductorRating` entries per row — one `targetRole: "DRIVER"` and one
 * `targetRole: "CONDUCTOR"`. This lets the metrics page render both averages
 * from a single commuter rating. Rows predating the driver/conductor split
 * have a null conductor rating — fall back to the driver's score so the
 * conductor entry still renders sensibly.
 */
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("scope") === "all_time") {
    const result = await proxyToLaravel(request, "/conductor/ratings?scope=all_time");
    if (!result.ok) {
      return jsonError(result.message ?? "Unable to load ratings.", result.status);
    }

    const { conductor, driver } = result.data as { conductor: RatingSummary; driver: RatingSummary };
    const distribution = [1, 2, 3, 4, 5].map(
      (star) => (conductor.distribution[String(star)] ?? 0) + (driver.distribution[String(star)] ?? 0),
    ) as RatingMetrics["distribution"];
    const totalRatings = conductor.total_count + driver.total_count;
    const metrics: RatingMetrics = {
      totalRatings,
      averageRating: totalRatings > 0
        ? Math.round(distribution.reduce((sum, count, index) => sum + count * (index + 1), 0) / totalRatings * 10) / 10
        : 0,
      overallSatisfaction: totalRatings > 0
        ? Math.round((distribution[3] + distribution[4]) / totalRatings * 100)
        : 0,
      conductorAverage: conductor.average_rating,
      conductorCount: conductor.total_count,
      driverAverage: driver.average_rating,
      driverCount: driver.total_count,
      distribution,
    };

    return jsonData(metrics);
  }

  const shiftId =
    request.nextUrl.searchParams.get("shift_id") ??
    request.nextUrl.searchParams.get("shiftId");

  if (!shiftId) {
    return jsonError("shift_id query parameter is required.");
  }

  const result = await proxyToLaravel(
    request,
    `/conductor/ratings?shift_id=${encodeURIComponent(shiftId)}`
  );

  if (!result.ok) {
    return jsonError(result.message ?? "Unable to load ratings.", result.status);
  }

  const feedback = (result.data as FeedbackRow[] | null) ?? [];

  const ratings: ConductorRating[] = feedback.flatMap((f) => [
    {
      ratingId: `${f.id}-drv`,
      commuterId: f.commuter_id,
      commuterName: f.commuter_name ?? "Anonymous Commuter",
      shiftId: f.shift_id,
      targetRole: "DRIVER",
      targetId: f.driver_id,
      score: f.rating,
      comment: f.comment ?? "",
      createdAt: f.created_at,
    },
    {
      ratingId: `${f.id}-cond`,
      commuterId: f.commuter_id,
      commuterName: f.commuter_name ?? "Anonymous Commuter",
      shiftId: f.shift_id,
      targetRole: "CONDUCTOR",
      targetId: f.conductor_id,
      score: f.conductor_rating ?? f.rating,
      comment: f.conductor_comment ?? "",
      createdAt: f.created_at,
    },
  ]);

  return jsonData(ratings);
}
