// lib/fare-matrix-data.ts
// Single source of truth for the CHATCO fare matrix.
// 34 operational point areas along the Calumpit–Meycauayan jeepney route.
//
// FARE LOGIC:
//   • Barangay-based fare progression model
//   • The first few barangays traveled are covered by the BASE FARE
//   • Every succeeding barangay beyond the base zone is one fare increment
//   • Applies regardless of route direction
//   • Bold items = BARANGAYS (fare zones); indented items = landmarks within the zone

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FarePoint {
  /** Sequential point number 1–34 along the route */
  pointNumber: number;
  /** Display name (includes landmark / barangay info) */
  name: string;
  /** Regular (full) fare – cumulative from Calumpit terminal (Point 34) */
  regularFare: number;
  /** Discounted fare (student / senior / PWD) – cumulative from Calumpit terminal */
  discountedFare: number;
  /** Landmark reference points within the same fare zone (same fare) */
  subStops?: string[];
}

export interface FareResult {
  fromPoint: FarePoint;
  toPoint: FarePoint;
  /** Number of point-area intervals between the two points */
  barangaysTraveled: number;
  /** Computed regular fare for this pair */
  regularFare: number;
  /** Computed discounted fare for this pair */
  discountedFare: number;
  /** Base fare that covers the first zone */
  baseFare: number;
  /** Per-barangay increment after the base zone */
  succeedingFare: number;
  /** How many succeeding increments applied */
  succeedingCount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum regular fare (within base-fare zone — first 4 barangays) */
const MINIMUM_REGULAR_FARE = 18.0;
/** Minimum discounted fare (within base-fare zone — first 4 barangays) */
const MINIMUM_DISCOUNTED_FARE = 14.4;

/**
 * The base fare (₱18) covers the first 4 barangays traveled.
 * Every succeeding barangay beyond the 4th is one fare increment (₱2).
 * Direction does not matter — same logic applies.
 */
const BASE_ZONE_INTERVALS = 4;

/** Per-barangay fare increment after the base zone */
const SUCCEEDING_FARE_INCREMENT = 2.0;

// ─── 34 Operational Point Areas ──────────────────────────────────────────────

export const initialFarePoints: FarePoint[] = [
  {
    pointNumber: 1,
    name: "Star Oil / Puregold Brgy Ba",
    regularFare: 78.5,
    discountedFare: 62.8,
  },
  {
    pointNumber: 2,
    name: "Puregold Jr Aliw / Meycauayan",
    regularFare: 76.5,
    discountedFare: 61.2,
  },
  {
    pointNumber: 3,
    name: "Pandayan",
    regularFare: 74.25,
    discountedFare: 59.4,
  },
  {
    pointNumber: 4,
    name: "SM Marilao",
    regularFare: 72.0,
    discountedFare: 57.6,
  },
  {
    pointNumber: 5,
    name: "Marilao Public Market",
    regularFare: 69.75,
    discountedFare: 55.8,
  },
  {
    pointNumber: 6,
    name: "Toyota Marilao / Abangan",
    regularFare: 67.5,
    discountedFare: 54.0,
  },
  {
    pointNumber: 7,
    name: "Lolomboy / Bocaue Specialist",
    regularFare: 65.5,
    discountedFare: 52.4,
  },
  {
    pointNumber: 8,
    name: "Petron Brgy Bonlo Bocaue",
    regularFare: 63.25,
    discountedFare: 50.6,
  },
  {
    pointNumber: 9,
    name: "BDO Binang First Bocaue",
    regularFare: 61.0,
    discountedFare: 48.8,
  },
  {
    pointNumber: 10,
    name: "Bocaue Public Market",
    regularFare: 58.75,
    discountedFare: 47.0,
  },
  {
    pointNumber: 11,
    name: "Intercity Gate 1",
    regularFare: 56.75,
    discountedFare: 45.4,
  },
  {
    pointNumber: 12,
    name: "Inter City Gate 2 Balagtas",
    regularFare: 54.5,
    discountedFare: 43.6,
  },
  {
    pointNumber: 13,
    name: "Balagtas Municipal Hall",
    regularFare: 52.25,
    discountedFare: 41.8,
  },
  {
    pointNumber: 14,
    name: "STI Colleges Brgy Burol 1st",
    regularFare: 50.0,
    discountedFare: 40.0,
  },
  {
    pointNumber: 15,
    name: "Tuktukan Gas Station Guiguinto",
    regularFare: 47.75,
    discountedFare: 38.2,
  },
  {
    pointNumber: 16,
    name: "Guiguinto Cruz / Puregold G",
    regularFare: 45.75,
    discountedFare: 36.6,
  },
  {
    pointNumber: 17,
    name: "Waltermart Guiguinto",
    regularFare: 43.5,
    discountedFare: 34.8,
  },
  {
    pointNumber: 18,
    name: "TESDA / Estrella",
    regularFare: 41.25,
    discountedFare: 33.0,
  },
  {
    pointNumber: 19,
    name: "Tabang / Tulay Guiguinto",
    regularFare: 39.0,
    discountedFare: 31.2,
  },
  {
    pointNumber: 20,
    name: "Tikay Elementary School Malolos",
    regularFare: 36.75,
    discountedFare: 29.4,
  },
  {
    pointNumber: 21,
    name: "San Pablo Malolos / Crossing",
    regularFare: 34.75,
    discountedFare: 27.8,
  },
  {
    pointNumber: 22,
    name: "Paradise / Marcelo / SNR",
    regularFare: 32.5,
    discountedFare: 26.0,
  },
  {
    pointNumber: 23,
    name: "STI / Dakila",
    regularFare: 30.25,
    discountedFare: 24.2,
  },
  {
    pointNumber: 24,
    name: "Sunlife Malolos Crossing",
    regularFare: 28.0,
    discountedFare: 22.4,
  },
  {
    pointNumber: 25,
    name: "BSU / Kapitolyo",
    regularFare: 25.75,
    discountedFare: 20.6,
  },
  {
    pointNumber: 26,
    name: "Builders Warehouse Alido",
    regularFare: 23.75,
    discountedFare: 19.0,
  },
  {
    pointNumber: 27,
    name: "Central Escolar CEU Malolos",
    regularFare: 21.5,
    discountedFare: 17.2,
  },
  {
    pointNumber: 28,
    name: "MBB Royal Hardware Longos",
    regularFare: 19.25,
    discountedFare: 15.4,
    subStops: ["MBB Royal", "Vista", "Walter", "Heritage"],
  },
  {
    pointNumber: 29,
    name: "Wilcon Depot / Pio Calumpit",
    regularFare: 18.0,
    discountedFare: 14.4,
  },
  {
    pointNumber: 30,
    name: "San Marcos / Brgy Pio Cruzc",
    regularFare: 18.0,
    discountedFare: 14.4,
  },
  {
    pointNumber: 31,
    name: "Petron Gas Station Bagbag",
    regularFare: 18.0,
    discountedFare: 14.4,
  },
  {
    pointNumber: 32,
    name: "Labangan Bridge Calumpit",
    regularFare: 18.0,
    discountedFare: 14.4,
  },
  {
    pointNumber: 33,
    name: "Calumpit Crossing Jollibee",
    regularFare: 18.0,
    discountedFare: 14.4,
  },
  {
    pointNumber: 34,
    name: "JEDS Island Resort",
    regularFare: 18.0,
    discountedFare: 14.4,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findPoint(pointNumber: number): FarePoint | undefined {
  return initialFarePoints.find((p) => p.pointNumber === pointNumber);
}

export function getFareByPoints(
  fromPointNumber: number,
  toPointNumber: number
): FareResult {
  const fromPoint = findPoint(fromPointNumber);
  const toPoint = findPoint(toPointNumber);

  if (!fromPoint || !toPoint) {
    throw new Error(
      `Invalid point number: from=${fromPointNumber}, to=${toPointNumber}. ` +
        `Valid range is 1–${initialFarePoints.length}.`
    );
  }

  const barangaysTraveled = Math.abs(fromPointNumber - toPointNumber);

  if (barangaysTraveled === 0) {
    return {
      fromPoint,
      toPoint,
      barangaysTraveled: 0,
      regularFare: MINIMUM_REGULAR_FARE,
      discountedFare: MINIMUM_DISCOUNTED_FARE,
      baseFare: MINIMUM_REGULAR_FARE,
      succeedingFare: SUCCEEDING_FARE_INCREMENT,
      succeedingCount: 0,
    };
  }

  const rawRegularFare = Math.abs(fromPoint.regularFare - toPoint.regularFare);
  const rawDiscountedFare = Math.abs(
    fromPoint.discountedFare - toPoint.discountedFare
  );

  const regularFare = Math.max(rawRegularFare, MINIMUM_REGULAR_FARE);
  const discountedFare = Math.max(rawDiscountedFare, MINIMUM_DISCOUNTED_FARE);

  const succeedingCount = Math.max(0, barangaysTraveled - BASE_ZONE_INTERVALS);

  return {
    fromPoint,
    toPoint,
    barangaysTraveled,
    regularFare: Math.round(regularFare * 100) / 100,
    discountedFare: Math.round(discountedFare * 100) / 100,
    baseFare: MINIMUM_REGULAR_FARE,
    succeedingFare: SUCCEEDING_FARE_INCREMENT,
    succeedingCount,
  };
}