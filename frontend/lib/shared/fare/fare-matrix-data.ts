// lib/fare-matrix-data.ts
// Single source of truth for the CHATCO fare matrix.
// 33 main places (fare points) along the Calumpit–Meycauayan jeepney route.
//
// FARE LOGIC:
//   • Barangay-based fare progression model
//   • The first few barangays traveled are covered by the BASE FARE
//   • Every succeeding barangay beyond the base zone is one fare increment
//   • Applies regardless of route direction
//   • Bold items = BARANGAYS (fare zones); indented items = landmarks within the zone

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FarePoint {
  /** Sequential point number 1–33 along the route */
  pointNumber: number;
  /** Display name (includes landmark / barangay info) */
  name: string;
  /** Regular (full) fare – cumulative from Calumpit terminal (Point 1) */
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

/** Minimum regular fare (within base-fare zone — first 4 places) */
const MINIMUM_REGULAR_FARE = 17.0;
/** Minimum discounted fare (within base-fare zone — first 4 places) */
const MINIMUM_DISCOUNTED_FARE = 13.5;

/**
 * The base fare (₱17) covers the first 4 places traveled.
 * Every succeeding place beyond the 4th is one fare increment (₱2.40),
 * rounded to the nearest ₱0.25 as in the LTFRB jeepney matrix.
 * Direction does not matter — same logic applies.
 */
const BASE_ZONE_INTERVALS = 4;

/** Per-barangay fare increment after the base zone */
const SUCCEEDING_FARE_INCREMENT = 2.4;

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

// Single source of truth for CHATCO fare computation
// Based on official CHATCO TSC fare matrix (Calumpit–Meycauayan route)
//
// OPERATIONAL LOGIC:
// - BOLD items in the fare matrix = BARANGAYS (operational fare zones)
// - Indented items under each barangay = landmarks, establishments, terminals,
//   pickup points, or key locations within that barangay
// - Fare computation is NOT based on exact GPS distance or unrestricted
//   point-to-point map calculation
// - The system follows a BARANGAY-BASED FARE PROGRESSION MODEL:
//   * The first four (4) barangays traveled are covered by the base fare
//   * Every succeeding barangay after the fourth is treated as one (1)
//     succeeding kilometer or fare increment
//   * This applies regardless of route direction or starting point
//
// FARE LOOKUP METHOD:
// The fare between any two barangays depends ONLY on the NUMBER of barangays
// traversed (not on which specific barangays). A lookup table maps the
// barangay count to the actual fare amount, derived directly from the
// cooperative's official fare matrix.

export interface PointArea {
  pointNumber: number;
  code: string;
  name: string; // Barangay name (the bold text in the fare matrix)
  landmarks: string[]; // Landmarks/establishments within this barangay
  regularFare: number; // Fare from Calumpit terminal (regular)
  discountedFare: number; // Fare from Calumpit terminal (student/senior/PWD)
  coordinates: { lat: number; lng: number };
}

/**
 * 33 operational barangays along the Calumpit → Meycauayan route.
 *
 * Fares shown are FROM the Calumpit terminal TO that barangay.
 * Regular fare = full price. Discounted = Student / Senior / PWD.
 *
 * Each barangay represents a FARE ZONE. The landmarks listed under each
 * barangay are reference points belonging to that fare zone — they are
 * NOT separate fare points. Conductors manually select the operational
 * barangay/zone during fare processing.
 */
export const FARE_MATRIX: PointArea[] = [
  {
    pointNumber: 1,
    code: "CMLPT",
    name: "Calumpit",
    landmarks: ["Gatbuca", "Crossing", "Caltex"],
    regularFare: 17.0,
    discountedFare: 13.5,
    coordinates: { lat: 14.9260, lng: 120.7680 },
  },
  {
    pointNumber: 2,
    code: "CI",
    name: "C.I. (Colegio de Calumpit)",
    landmarks: ["ASM"],
    regularFare: 17.0,
    discountedFare: 13.5,
    coordinates: { lat: 14.9240, lng: 120.7710 },
  },
  {
    pointNumber: 3,
    code: "BAGBG",
    name: "Bagbag",
    landmarks: ["UPPC", "Petron", "Xebron", "Phoenix"],
    regularFare: 17.0,
    discountedFare: 13.5,
    coordinates: { lat: 14.9200, lng: 120.7740 },
  },
  {
    pointNumber: 4,
    code: "SMARC",
    name: "San Marcos",
    landmarks: ["PEO", "Lares", "Dream Oil"],
    regularFare: 17.0,
    discountedFare: 13.5,
    coordinates: { lat: 14.9140, lng: 120.7780 },
  },
  {
    pointNumber: 5,
    code: "BORNE",
    name: "Borneo",
    landmarks: ["Gardenville", "Metropolis", "Lexber", "McArthur"],
    regularFare: 19.5,
    discountedFare: 15.5,
    coordinates: { lat: 14.9070, lng: 120.7820 },
  },
  {
    pointNumber: 6,
    code: "LONGS",
    name: "Longos",
    landmarks: ["MBB Royal", "Vista", "Walter", "Heritage"],
    regularFare: 21.75,
    discountedFare: 17.5,
    coordinates: { lat: 14.8930, lng: 120.7910 },
  },
  {
    pointNumber: 7,
    code: "CEU",
    name: "CEU",
    landmarks: ["South", "Grand Royal"],
    regularFare: 24.25,
    discountedFare: 19.25,
    coordinates: { lat: 14.8860, lng: 120.7970 },
  },
  {
    pointNumber: 8,
    code: "BLDRS",
    name: "Builders",
    landmarks: ["BPC", "Alido", "City Hall", "Puregold"],
    regularFare: 26.5,
    discountedFare: 21.25,
    coordinates: { lat: 14.8780, lng: 120.8040 },
  },
  {
    pointNumber: 9,
    code: "BSU",
    name: "BSU",
    landmarks: ["Xentromall", "Graceland", "Kapitolyo"],
    regularFare: 29.0,
    discountedFare: 23.25,
    coordinates: { lat: 14.8700, lng: 120.8130 },
  },
  {
    pointNumber: 10,
    code: "CROML",
    name: "Crossing Malolos",
    landmarks: ["Pag-IBIG", "Robinsons", "Grand Town", "Landbank"],
    regularFare: 31.5,
    discountedFare: 25.0,
    coordinates: { lat: 14.8620, lng: 120.8210 },
  },
  {
    pointNumber: 11,
    code: "STIML",
    name: "S.T.I.",
    landmarks: ["Rapids", "Gramman", "Dakila"],
    regularFare: 33.75,
    discountedFare: 27.0,
    coordinates: { lat: 14.8540, lng: 120.8300 },
  },
  {
    pointNumber: 12,
    code: "MARCL",
    name: "Marcelo",
    landmarks: ["Paradise", "S&R", "Madera"],
    regularFare: 36.25,
    discountedFare: 29.0,
    coordinates: { lat: 14.8460, lng: 120.8400 },
  },
  {
    pointNumber: 13,
    code: "SNPBL",
    name: "San Pablo",
    landmarks: ["Ford", "Stoplight", "Kanto Maliit", "Pastry"],
    regularFare: 38.5,
    discountedFare: 31.0,
    coordinates: { lat: 14.8380, lng: 120.8510 },
  },
  {
    pointNumber: 14,
    code: "TIKAY",
    name: "Tikay",
    landmarks: ["DPWH", "School", "NFA", "Industrial", "Caltex", "Jollibee"],
    regularFare: 41.0,
    discountedFare: 32.75,
    coordinates: { lat: 14.8300, lng: 120.8620 },
  },
  {
    pointNumber: 15,
    code: "TABNG",
    name: "Tabang",
    landmarks: ["Eurobake", "Tulay", "Tawiran"],
    regularFare: 43.5,
    discountedFare: 34.75,
    coordinates: { lat: 14.8220, lng: 120.8730 },
  },
  {
    pointNumber: 16,
    code: "TESDA",
    name: "TESDA",
    landmarks: ["Junkshop", "LTO (Masagana)", "Ajinomoto", "Iral", "Estrella", "Mighty"],
    regularFare: 45.75,
    discountedFare: 36.75,
    coordinates: { lat: 14.8140, lng: 120.8830 },
  },
  {
    pointNumber: 17,
    code: "ILANG",
    name: "Ilang-Ilang",
    landmarks: ["Aldea", "Walter", "Church", "Munisipyo", "Agatha Square"],
    regularFare: 48.25,
    discountedFare: 38.5,
    coordinates: { lat: 14.8060, lng: 120.8930 },
  },
  {
    pointNumber: 18,
    code: "CRUZ",
    name: "Cruz",
    landmarks: ["Builders", "Honda", "Buslo", "Unitop", "Divimart"],
    regularFare: 50.5,
    discountedFare: 40.5,
    coordinates: { lat: 14.7980, lng: 120.9030 },
  },
  {
    pointNumber: 19,
    code: "TUKTK",
    name: "Tuktukan",
    landmarks: ["Orovilla", "Barangay Hall", "Patubig", "Russi", "AFA", "San Pablo Street", "Wilcon"],
    regularFare: 53.0,
    discountedFare: 42.5,
    coordinates: { lat: 14.7910, lng: 120.9100 },
  },
  {
    pointNumber: 20,
    code: "SAPRO",
    name: "SAPRO / STI",
    landmarks: ["Palmera", "Pascual", "Honda", "Rocka"],
    regularFare: 55.5,
    discountedFare: 44.25,
    coordinates: { lat: 14.7850, lng: 120.9170 },
  },
  {
    pointNumber: 21,
    code: "BALGT",
    name: "Balagtas",
    landmarks: ["Petron/Ultra", "Meralco", "Mariano", "Palengke", "Munisipyo", "San Juan/Sabungan", "Olma"],
    regularFare: 57.75,
    discountedFare: 46.25,
    coordinates: { lat: 14.7800, lng: 120.9240 },
  },
  {
    pointNumber: 22,
    code: "GATE2",
    name: "Intercity (Gate 2)",
    landmarks: ["Galaxy", "Gate 2"],
    regularFare: 60.25,
    discountedFare: 48.25,
    coordinates: { lat: 14.7750, lng: 120.9310 },
  },
  {
    pointNumber: 23,
    code: "GATE1",
    name: "Intercity (Gate 1)",
    landmarks: ["Cruz sa Wawa", "Gate 1", "BDO", "SSS", "Golden Aub"],
    regularFare: 62.5,
    discountedFare: 50.0,
    coordinates: { lat: 14.7700, lng: 120.9370 },
  },
  {
    pointNumber: 24,
    code: "WAKAS",
    name: "Wakas",
    landmarks: ["Yanga", "Wakas Terminal", "BPI", "Metrobank", "Palengke", "Crossing"],
    regularFare: 65.0,
    discountedFare: 52.0,
    coordinates: { lat: 14.7660, lng: 120.9430 },
  },
  {
    pointNumber: 25,
    code: "BINNG",
    name: "Binang",
    landmarks: ["Sto. Niño", "Shell", "Igolot", "BDO", "Puregold", "Tawiran", "JIL"],
    regularFare: 67.5,
    discountedFare: 54.0,
    coordinates: { lat: 14.7610, lng: 120.9490 },
  },
  {
    pointNumber: 26,
    code: "BONLO",
    name: "Bonlo",
    landmarks: ["Barangay Hall", "Petron", "Joners", "McDo"],
    regularFare: 69.75,
    discountedFare: 55.75,
    coordinates: { lat: 14.7570, lng: 120.9540 },
  },
  {
    pointNumber: 27,
    code: "LOLMB",
    name: "Lolomboy",
    landmarks: ["Caltex", "LTO", "Specialist", "Honda"],
    regularFare: 72.25,
    discountedFare: 57.75,
    coordinates: { lat: 14.7530, lng: 120.9580 },
  },
  {
    pointNumber: 28,
    code: "TOYOT",
    name: "Toyota / Marilao",
    landmarks: ["Sabungan", "Socorro", "PDM", "Decca", "Dating Petron"],
    regularFare: 74.5,
    discountedFare: 59.75,
    coordinates: { lat: 14.7490, lng: 120.9630 },
  },
  {
    pointNumber: 29,
    code: "CRMLA",
    name: "Crossing Marilao",
    landmarks: ["Ford", "Tulay"],
    regularFare: 77.0,
    discountedFare: 61.5,
    coordinates: { lat: 14.7470, lng: 120.9680 },
  },
  {
    pointNumber: 30,
    code: "SMMRL",
    name: "SM Marilao",
    landmarks: ["Saog", "Lias", "Nazareno", "Medallion"],
    regularFare: 79.5,
    discountedFare: 63.5,
    coordinates: { lat: 14.7450, lng: 120.9740 },
  },
  {
    pointNumber: 31,
    code: "PNDYN",
    name: "Pandayan",
    landmarks: ["C Fuel", "7-Eleven", "Iglesia"],
    regularFare: 81.75,
    discountedFare: 65.5,
    coordinates: { lat: 14.7420, lng: 120.9800 },
  },
  {
    pointNumber: 32,
    code: "MEYCA",
    name: "Meycauayan",
    landmarks: ["City Hall", "Crossing", "MC", "Metrobank"],
    regularFare: 84.25,
    discountedFare: 67.25,
    coordinates: { lat: 14.7390, lng: 120.9860 },
  },
  {
    pointNumber: 33,
    code: "BANGA",
    name: "Banga",
    landmarks: ["STI", "Petron"],
    regularFare: 86.5,
    discountedFare: 69.25,
    coordinates: { lat: 14.7350, lng: 120.9920 },
  },
];

// Fallback fare points for the calculators, from the same 33 main places.
export const initialFarePoints: FarePoint[] = FARE_MATRIX.map((p) => ({
  pointNumber: p.pointNumber,
  name: p.name,
  regularFare: p.regularFare,
  discountedFare: p.discountedFare,
  subStops: p.landmarks,
}));

// ─── Fare-by-Barangay-Count Lookup ─────────────────────────────────────
//
// The fare depends ONLY on how many barangays are traversed, not on which
// specific barangays. This table maps barangay count → fare.
// Generated from the Financial Rules defaults: ₱17 for the first 4, +₱2.40 each
// after, nearest ₱0.25 with the discount taken before rounding (LTFRB matrix).
//
// Example: Traveling through 6 places (e.g., Calumpit → Longos) costs ₱21.75.
// The same fare applies for any 6-place trip (e.g., Borneo → Builders).

const FARE_BY_BARANGAY_COUNT_REGULAR: Record<number, number> = {
  1: 17.0,
  2: 17.0,
  3: 17.0,
  4: 17.0,
  5: 19.5,
  6: 21.75,
  7: 24.25,
  8: 26.5,
  9: 29.0,
  10: 31.5,
  11: 33.75,
  12: 36.25,
  13: 38.5,
  14: 41.0,
  15: 43.5,
  16: 45.75,
  17: 48.25,
  18: 50.5,
  19: 53.0,
  20: 55.5,
  21: 57.75,
  22: 60.25,
  23: 62.5,
  24: 65.0,
  25: 67.5,
  26: 69.75,
  27: 72.25,
  28: 74.5,
  29: 77.0,
  30: 79.5,
  31: 81.75,
  32: 84.25,
  33: 86.5,
};

const FARE_BY_BARANGAY_COUNT_DISCOUNTED: Record<number, number> = {
  1: 13.5,
  2: 13.5,
  3: 13.5,
  4: 13.5,
  5: 15.5,
  6: 17.5,
  7: 19.25,
  8: 21.25,
  9: 23.25,
  10: 25.0,
  11: 27.0,
  12: 29.0,
  13: 31.0,
  14: 32.75,
  15: 34.75,
  16: 36.75,
  17: 38.5,
  18: 40.5,
  19: 42.5,
  20: 44.25,
  21: 46.25,
  22: 48.25,
  23: 50.0,
  24: 52.0,
  25: 54.0,
  26: 55.75,
  27: 57.75,
  28: 59.75,
  29: 61.5,
  30: 63.5,
  31: 65.5,
  32: 67.25,
  33: 69.25,
};

// ─── Fare Configuration Constants ──────────────────────────────────────

export const FARE_CONFIG = {
  /** Base fare covers the first 4 places traveled */
  BASE_BARANGAY_COUNT: 4,
  /** Regular base fare (PHP) */
  BASE_FARE_REGULAR: 17.0,
  /** Discounted base fare (PHP) for Student / Senior / PWD */
  BASE_FARE_DISCOUNTED: 13.5,
  /** Succeeding fare per place after the 4th (regular) */
  SUCCEEDING_FARE_REGULAR: 2.4,
  /** Succeeding fare per place after the 4th (discounted) */
  SUCCEEDING_FARE_DISCOUNTED: 1.92,
  /** Total number of operational barangays */
  TOTAL_BARANGAYS: 33,
} as const;

// ─── Helper Functions ──────────────────────────────────────────────────

/** Get a point area (barangay) by its position number (1–33) */
export function getPointByNumber(num: number): PointArea | undefined {
  return FARE_MATRIX.find((p) => p.pointNumber === num);
}

/** Get a point area (barangay) by its code */
export function getPointByCode(code: string): PointArea | undefined {
  return FARE_MATRIX.find((p) => p.code === code);
}

/**
 * Calculate fare between any two barangays using the barangay-based
 * progression model.
 *
 * The fare depends ONLY on the number of barangays traversed:
 *   barangaysTraversed = |destPosition - originPosition| + 1
 *
 * This value is then looked up in the official fare table.
 *
 * Example:
 *   Origin: Calumpit (position 1)
 *   Destination: Longos (position 6)
 *   Barangays traversed: |6 - 1| + 1 = 6
 *   Regular fare: ₱21.75 (from FARE_BY_BARANGAY_COUNT table)
 *
 * The same fare of ₱21.75 applies for ANY 6-place trip regardless
 * of starting point (e.g., Borneo → Builders is also 6 places = ₱21.75).
 */
export function getFareBetween(
  originPosition: number,
  destinationPosition: number,
  isDiscounted: boolean
): number {
  const origin = getPointByNumber(originPosition);
  const destination = getPointByNumber(destinationPosition);

  if (!origin || !destination) return 0;

  const barangaysTraversed =
    Math.abs(destination.pointNumber - origin.pointNumber) + 1;

  const fareTable = isDiscounted
    ? FARE_BY_BARANGAY_COUNT_DISCOUNTED
    : FARE_BY_BARANGAY_COUNT_REGULAR;

  return fareTable[barangaysTraversed] ?? (isDiscounted ? 13.5 : 17.0);
}

/**
 * Get the number of barangays traversed between two points.
 */
export function getBarangaysTraversed(
  originPosition: number,
  destinationPosition: number
): number {
  return Math.abs(destinationPosition - originPosition) + 1;
}

/**
 * Get the fare explanation string for a given trip.
 * Useful for displaying fare breakdowns in the UI.
 *
 * Example output:
 *   "Base fare covers first 4 barangays + 2 succeeding barangays"
 *   "Base fare (within first 4 barangays)"
 */
export function getFareExplanation(
  originPosition: number,
  destinationPosition: number
): string {
  const count = getBarangaysTraversed(originPosition, destinationPosition);

  if (count <= FARE_CONFIG.BASE_BARANGAY_COUNT) {
    return `Base fare (within first ${count} barangay${count > 1 ? "s" : ""})`;
  }

  const succeeding = count - FARE_CONFIG.BASE_BARANGAY_COUNT;
  return `Base fare covers first ${FARE_CONFIG.BASE_BARANGAY_COUNT} barangays + ${succeeding} succeeding barangay${succeeding > 1 ? "s" : ""}`;
}

/**
 * Find the nearest operational barangay to a given GPS coordinate.
 * Uses the Haversine formula for accurate distance calculation.
 */
export function findNearestPoint(lat: number, lng: number): PointArea {
  let nearest = FARE_MATRIX[0];
  let minDistance = Infinity;

  for (const point of FARE_MATRIX) {
    const distance = haversineDistance(
      lat,
      lng,
      point.coordinates.lat,
      point.coordinates.lng
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = point;
    }
  }

  return nearest;
}

/**
 * Search barangays by name or landmark.
 * Used for the pickup/dropoff selector UI.
 */
export function searchPoints(query: string): PointArea[] {
  const q = query.toLowerCase().trim();
  if (!q) return FARE_MATRIX;

  return FARE_MATRIX.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.landmarks.some((l) => l.toLowerCase().includes(q))
  );
}

/**
 * Get the fare for a specific number of barangays traversed.
 * Returns null if the count is out of range.
 */
export function getFareByBarangayCount(
  count: number,
  isDiscounted: boolean
): number | null {
  const table = isDiscounted
    ? FARE_BY_BARANGAY_COUNT_DISCOUNTED
    : FARE_BY_BARANGAY_COUNT_REGULAR;
  return table[count] ?? null;
}

/** Haversine distance in meters between two lat/lng points */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

