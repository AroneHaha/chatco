// ─── Types ───────────────────────────────────────────────────────────
export interface ConductorRating {
  ratingId: string;
  commuterId: string;
  commuterName: string;
  shiftId: string;
  targetRole: "DRIVER" | "CONDUCTOR";
  targetId: string;
  score: number; // 1-5
  comment: string; // stored but not surfaced to conductor
  createdAt: string; // ISO string
}

export interface RatingMetrics {
  overallSatisfaction: number; // 0-100 percentage of 4+ star ratings
  averageRating: number;
  totalRatings: number;
  conductorAverage: number;
  conductorCount: number;
  driverAverage: number;
  driverCount: number;
  distribution: [number, number, number, number, number]; // index 0 = 1★, index 4 = 5★
}

// ─── Mock Data Pools ─────────────────────────────────────────────────
const MOCK_NAMES = [
  "Juan Dela Cruz",
  "Maria Santos",
  "Jose Rizal",
  "Ana Reyes",
  "Pedro Garcia",
  "Rosa Lim",
  "Carlos Mendoza",
  "Sofia Tan",
  "Miguel Cruz",
  "Isabella Rivera",
  "Andres Santos",
  "Carmen Garcia",
  "Rafael Lim",
  "Elena Tan",
  "Marco Mendoza",
  "Lucia Fernandez",
  "Diego Ramos",
  "Gabriela Torres",
  "Fernando Lopez",
  "Daniela Rivera",
  "Antonio Villanueva",
  "Patricia Cheng",
  "Roberto Navarro",
  "Alicia Flores",
  "Santiago Reyes",
];

const MOCK_COMMENTS = [
  "Very polite and helpful conductor.",
  "Smooth ride, driver was careful.",
  "Conductor was attentive with the change.",
  "Great service, would ride again!",
  "Driver followed the route properly.",
  "A bit slow but safe driving.",
  "Conductor assisted elderly passengers well.",
  "Clean vehicle, comfortable ride.",
  "Very organized ticketing process.",
  "Driver was courteous and professional.",
  "Conductor smiled and greeted everyone.",
  "Felt safe the entire trip.",
  "Driver navigated traffic really well.",
  "Conductor made sure everyone paid correctly.",
  "Excellent experience overall!",
];

// ─── Helpers ─────────────────────────────────────────────────────────
function generateId(): string {
  return `r_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function hashString(str: string): number {
  return str.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

/** Seeded PRNG for deterministic mock data per shiftId */
function createRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ─── Public API ──────────────────────────────────────────────────────

const STORAGE_PREFIX = "conductor_ratings_";

/**
 * Seed ratings for a shift into localStorage if they don't already exist.
 * conductorName and driverName are used as targetIds since no UUIDs exist yet.
 */
export function seedRatingsForShift(
  shiftId: string,
  conductorName: string,
  driverName: string
): ConductorRating[] {
  const key = `${STORAGE_PREFIX}${shiftId}`;
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      return JSON.parse(existing) as ConductorRating[];
    } catch {
      // corrupted – regenerate
    }
  }

  const rng = createRNG(hashString(shiftId));
  const count = 18 + Math.floor(rng() * 14); // 18-31 ratings
  const ratings: ConductorRating[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < count; i++) {
    let nameIdx: number;
    do {
      nameIdx = Math.floor(rng() * MOCK_NAMES.length);
    } while (usedIndices.has(nameIdx) && usedIndices.size < MOCK_NAMES.length);
    usedIndices.add(nameIdx);

    // ~60% conductor, ~40% driver
    const targetRole: "DRIVER" | "CONDUCTOR" =
      rng() < 0.6 ? "CONDUCTOR" : "DRIVER";

    // Weighted score distribution (realistic: mostly positive)
    const r = rng();
    let score: number;
    if (r < 0.42) score = 5;
    else if (r < 0.74) score = 4;
    else if (r < 0.89) score = 3;
    else if (r < 0.96) score = 2;
    else score = 1;

    // ~45% chance of comment (stored for admin use, not shown to conductor)
    const hasComment = rng() < 0.45;
    const comment = hasComment
      ? MOCK_COMMENTS[Math.floor(rng() * MOCK_COMMENTS.length)]
      : "";

    // Random time within last 8 hours
    const minutesAgo = Math.floor(rng() * 480);
    const createdAt = new Date(
      Date.now() - minutesAgo * 60 * 1000
    ).toISOString();

    ratings.push({
      ratingId: generateId(),
      commuterId: `commuter_${nameIdx}`,
      commuterName: MOCK_NAMES[nameIdx],
      shiftId,
      targetRole,
      targetId: targetRole === "CONDUCTOR" ? conductorName : driverName,
      score,
      comment,
      createdAt,
    });
  }

  // Most recent first
  ratings.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  localStorage.setItem(key, JSON.stringify(ratings));
  return ratings;
}

/** Read existing ratings for a shift (no seeding). */
export function getRatingsForShift(shiftId: string): ConductorRating[] {
  const key = `${STORAGE_PREFIX}${shiftId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ConductorRating[];
  } catch {
    return [];
  }
}

/** Compute aggregate metrics from an array of ratings. */
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
  const satisfied = ratings.filter((r) => r.score >= 4).length;
  const overallSatisfaction = Math.round((satisfied / total) * 100);
  const averageRating =
    Math.round(
      (ratings.reduce((s, r) => s + r.score, 0) / total) * 10
    ) / 10;

  const condRatings = ratings.filter((r) => r.targetRole === "CONDUCTOR");
  const drivRatings = ratings.filter((r) => r.targetRole === "DRIVER");

  const conductorAverage =
    condRatings.length > 0
      ? Math.round(
          (condRatings.reduce((s, r) => s + r.score, 0) /
            condRatings.length) *
            10
        ) / 10
      : 0;

  const driverAverage =
    drivRatings.length > 0
      ? Math.round(
          (drivRatings.reduce((s, r) => s + r.score, 0) /
            drivRatings.length) *
            10
        ) / 10
      : 0;

  const distribution: [number, number, number, number, number] = [
    0, 0, 0, 0, 0,
  ];
  ratings.forEach((r) => {
    distribution[r.score - 1]++;
  });

  return {
    overallSatisfaction,
    averageRating,
    totalRatings: total,
    conductorAverage,
    conductorCount: condRatings.length,
    driverAverage,
    driverCount: drivRatings.length,
    distribution,
  };
}

/** Return the appropriate color for a satisfaction percentage. */
export function getGaugeColor(pct: number): string {
  if (pct >= 90) return "#34D399"; // emerald-400
  if (pct >= 75) return "#62A0EA"; // primary-light
  if (pct >= 50) return "#FBBF24"; // amber-400
  return "#F87171"; // red-400
}

/** Return the appropriate Tailwind text color class for a satisfaction percentage. */
export function getGaugeTextClass(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 75) return "text-[#62A0EA]";
  if (pct >= 50) return "text-amber-400";
  return "text-red-400";
}