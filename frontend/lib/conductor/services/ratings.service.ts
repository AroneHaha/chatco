import { api, NetworkError } from "@/lib/api/client";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";

export interface ConductorRating {
  ratingId: string;
  commuterId: string;
  commuterName: string;
  shiftId: string;
  targetRole: "DRIVER" | "CONDUCTOR";
  targetId: string;
  score: number;
  comment: string;
  createdAt: string;
}

export interface RatingMetrics {
  overallSatisfaction: number;
  averageRating: number;
  totalRatings: number;
  conductorAverage: number;
  conductorCount: number;
  driverAverage: number;
  driverCount: number;
  distribution: [number, number, number, number, number];
}

function hasRemoteApi(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL);
}

export async function fetchRatingsForShift(shiftId: string): Promise<{
  ratings: ConductorRating[];
  error: string | null;
}> {
  if (hasRemoteApi()) {
    try {
      const response = await api.get<{ data: ConductorRating[] }>(
        CONDUCTOR_API.ratings(shiftId)
      );
      return { ratings: response.data ?? [], error: null };
    } catch (error) {
      if (error instanceof NetworkError) {
        return {
          ratings: [],
          error: "Unable to load ratings. Please try again.",
        };
      }
      throw error;
    }
  }

  return { ratings: [], error: null };
}

export function calculateMetrics(ratings: ConductorRating[]): RatingMetrics {
  if (ratings.length === 0) {
    return {
      overallSatisfaction: 0,
      averageRating: 0,
      totalRatings: 0,
      conductorAverage: 0,
      conductorCount: 0,
      driverAverage: 0,
      driverCount: 0,
      distribution: [0, 0, 0, 0, 0],
    };
  }

  const total = ratings.length;
  const satisfied = ratings.filter((rating) => rating.score >= 4).length;
  const overallSatisfaction = Math.round((satisfied / total) * 100);
  const averageRating =
    Math.round((ratings.reduce((sum, rating) => sum + rating.score, 0) / total) * 10) /
    10;

  const conductorRatings = ratings.filter((rating) => rating.targetRole === "CONDUCTOR");
  const driverRatings = ratings.filter((rating) => rating.targetRole === "DRIVER");

  const conductorAverage =
    conductorRatings.length > 0
      ? Math.round(
          (conductorRatings.reduce((sum, rating) => sum + rating.score, 0) /
            conductorRatings.length) *
            10
        ) / 10
      : 0;

  const driverAverage =
    driverRatings.length > 0
      ? Math.round(
          (driverRatings.reduce((sum, rating) => sum + rating.score, 0) /
            driverRatings.length) *
            10
        ) / 10
      : 0;

  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  ratings.forEach((rating) => {
    distribution[rating.score - 1]++;
  });

  return {
    overallSatisfaction,
    averageRating,
    totalRatings: total,
    conductorAverage,
    conductorCount: conductorRatings.length,
    driverAverage,
    driverCount: driverRatings.length,
    distribution,
  };
}

export function getGaugeColor(pct: number): string {
  if (pct >= 90) return "#34D399";
  if (pct >= 75) return "#62A0EA";
  if (pct >= 50) return "#FBBF24";
  return "#F87171";
}

export function getGaugeTextClass(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 75) return "text-[#62A0EA]";
  if (pct >= 50) return "text-amber-400";
  return "text-red-400";
}
