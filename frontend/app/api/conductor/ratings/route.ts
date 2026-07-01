import { NextRequest } from "next/server";
import { getConductorSession, unauthorizedResponse } from "@/lib/conductor/server/auth";
import { jsonData, jsonError } from "@/lib/conductor/server/response";
import { listFeedbackForShiftInMemory } from "@/lib/shared/server/inmemory-backend";
import type { ConductorRating } from "@/lib/conductor/services/ratings.service";

/**
 * GET /api/conductor/ratings?shift_id=…
 *
 * Returns the ratings (feedback) for a specific shift, mapped to the
 * `ConductorRating[]` shape the conductor metrics page consumes.
 *
 * Each commuter feedback row is stamped to BOTH the driver and the conductor
 * (the crew snapshot captured when the shift started), so we emit TWO
 * `ConductorRating` entries per feedback — one with `targetRole: "DRIVER"`
 * and one with `targetRole: "CONDUCTOR"`. This lets the metrics page render
 * both the driver's and conductor's averages from a single commuter rating,
 * matching the S6 requirement that "feedback goes to both driver and
 * conductor profiles."
 *
 * The conductor's active shift supplies the `shift_id` query param. Gated on
 * a valid conductor session (the conductor can only view ratings for their
 * own shifts).
 */
export async function GET(request: NextRequest) {
  const session = await getConductorSession(request);
  if (!session) return unauthorizedResponse();

  const shiftId =
    request.nextUrl.searchParams.get("shift_id") ??
    request.nextUrl.searchParams.get("shiftId");

  if (!shiftId) {
    return jsonError("shift_id query parameter is required.");
  }

  const feedback = listFeedbackForShiftInMemory(shiftId);

  // Emit a DRIVER + CONDUCTOR entry per feedback so the metrics page can
  // split averages by role. Both entries share the commuter's score + comment.
  const ratings: ConductorRating[] = feedback.flatMap((f) => [
    {
      ratingId: `${f.id}-drv`,
      commuterId: f.commuterId,
      commuterName: f.commuterName,
      shiftId: f.shiftId,
      targetRole: "DRIVER",
      targetId: f.driverId,
      score: f.rating,
      comment: f.comment ?? "",
      createdAt: f.createdAt,
    },
    {
      ratingId: `${f.id}-cond`,
      commuterId: f.commuterId,
      commuterName: f.commuterName,
      shiftId: f.shiftId,
      targetRole: "CONDUCTOR",
      targetId: f.conductorId,
      score: f.rating,
      comment: f.comment ?? "",
      createdAt: f.createdAt,
    },
  ]);

  return jsonData(ratings);
}
