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
    regularFare: 15.0,
    discountedFare: 12.0,
    coordinates: { lat: 14.9260, lng: 120.7680 },
  },
  {
    pointNumber: 2,
    code: "CI",
    name: "C.I. (Colegio de Calumpit)",
    landmarks: ["ASM"],
    regularFare: 15.0,
    discountedFare: 12.0,
    coordinates: { lat: 14.9240, lng: 120.7710 },
  },
  {
    pointNumber: 3,
    code: "BAGBG",
    name: "Bagbag",
    landmarks: ["UPPC", "Petron", "Xebron", "Phoenix"],
    regularFare: 15.0,
    discountedFare: 12.0,
    coordinates: { lat: 14.9200, lng: 120.7740 },
  },
  {
    pointNumber: 4,
    code: "SMARC",
    name: "San Marcos",
    landmarks: ["PEO", "Lares", "Dream Oil"],
    regularFare: 15.0,
    discountedFare: 12.0,
    coordinates: { lat: 14.9140, lng: 120.7780 },
  },
  {
    pointNumber: 5,
    code: "BORNE",
    name: "Borneo",
    landmarks: ["Gardenville", "Metropolis", "Lexber", "McArthur"],
    regularFare: 15.0,
    discountedFare: 12.0,
    coordinates: { lat: 14.9070, lng: 120.7820 },
  },
  {
    pointNumber: 6,
    code: "LONGS",
    name: "Longos",
    landmarks: ["MBB Royal", "Vista", "Walter", "Heritage"],
    regularFare: 16.25,
    discountedFare: 13.0,
    coordinates: { lat: 14.8930, lng: 120.7910 },
  },
  {
    pointNumber: 7,
    code: "CEU",
    name: "CEU",
    landmarks: ["South", "Grand Royal"],
    regularFare: 18.5,
    discountedFare: 14.75,
    coordinates: { lat: 14.8860, lng: 120.7970 },
  },
  {
    pointNumber: 8,
    code: "BLDRS",
    name: "Builders",
    landmarks: ["BPC", "Alido", "City Hall", "Pure Gold"],
    regularFare: 20.75,
    discountedFare: 16.5,
    coordinates: { lat: 14.8780, lng: 120.8040 },
  },
  {
    pointNumber: 9,
    code: "BSU",
    name: "BSU",
    landmarks: ["Xentromall", "Graceland", "Kapitolyo"],
    regularFare: 22.75,
    discountedFare: 18.25,
    coordinates: { lat: 14.8700, lng: 120.8130 },
  },
  {
    pointNumber: 10,
    code: "CROML",
    name: "Crossing Malolos",
    landmarks: ["Pag-IBIG", "Robinsons", "Grand Town", "Landbank"],
    regularFare: 25.0,
    discountedFare: 20.0,
    coordinates: { lat: 14.8620, lng: 120.8210 },
  },
  {
    pointNumber: 11,
    code: "STIML",
    name: "S.T.I.",
    landmarks: ["Rapids", "Gramman", "Dakila"],
    regularFare: 27.25,
    discountedFare: 21.75,
    coordinates: { lat: 14.8540, lng: 120.8300 },
  },
  {
    pointNumber: 12,
    code: "MARCL",
    name: "Marcelo",
    landmarks: ["Paradise", "S&R", "Madera"],
    regularFare: 29.5,
    discountedFare: 23.5,
    coordinates: { lat: 14.8460, lng: 120.8400 },
  },
  {
    pointNumber: 13,
    code: "SNPBL",
    name: "San Pablo",
    landmarks: ["Ford", "Stoplight", "Kanto Malit", "Pastry"],
    regularFare: 31.75,
    discountedFare: 25.25,
    coordinates: { lat: 14.8380, lng: 120.8510 },
  },
  {
    pointNumber: 14,
    code: "TIKAY",
    name: "Tikay",
    landmarks: ["DPHW", "School", "NFA", "Industrial", "Caltex", "Jollibee"],
    regularFare: 33.75,
    discountedFare: 27.0,
    coordinates: { lat: 14.8300, lng: 120.8620 },
  },
  {
    pointNumber: 15,
    code: "TABNG",
    name: "Tabang",
    landmarks: ["Eurobake", "Tulay", "Tawiran"],
    regularFare: 36.0,
    discountedFare: 28.75,
    coordinates: { lat: 14.8220, lng: 120.8730 },
  },
  {
    pointNumber: 16,
    code: "TESDA",
    name: "TESDA",
    landmarks: ["Junkshop", "LTO Masagana", "Ajinomoto", "Iral", "Estrella", "Mighty"],
    regularFare: 38.25,
    discountedFare: 30.5,
    coordinates: { lat: 14.8140, lng: 120.8830 },
  },
  {
    pointNumber: 17,
    code: "ILANG",
    name: "Ilang-Ilang",
    landmarks: ["Aldea", "Walter", "Church", "Munisipyo", "Agatha Square"],
    regularFare: 40.5,
    discountedFare: 32.25,
    coordinates: { lat: 14.8060, lng: 120.8930 },
  },
  {
    pointNumber: 18,
    code: "CRUZ",
    name: "Cruz",
    landmarks: ["Builders", "Honda", "Buslo", "Unitop", "Divimart"],
    regularFare: 42.75,
    discountedFare: 34.25,
    coordinates: { lat: 14.7980, lng: 120.9030 },
  },
  {
    pointNumber: 19,
    code: "TUKTK",
    name: "Tuktukan",
    landmarks: ["Orovilla", "Brgy Hall", "Patubig", "Russi", "AFA", "San Pablo St", "Wilcon"],
    regularFare: 44.75,
    discountedFare: 36.0,
    coordinates: { lat: 14.7910, lng: 120.9100 },
  },
  {
    pointNumber: 20,
    code: "SAPRO",
    name: "SAPRO / STI",
    landmarks: ["Palmera", "Pascual", "Honda", "Rocka"],
    regularFare: 47.0,
    discountedFare: 37.75,
    coordinates: { lat: 14.7850, lng: 120.9170 },
  },
  {
    pointNumber: 21,
    code: "BALGT",
    name: "Balagtas",
    landmarks: ["Petron/Ultra", "Meralco", "Mariano", "Palengke", "Munisipyo", "San Juan/Sabungan"],
    regularFare: 49.25,
    discountedFare: 39.5,
    coordinates: { lat: 14.7800, lng: 120.9240 },
  },
  {
    pointNumber: 22,
    code: "GATE2",
    name: "Enter City (Gate 2)",
    landmarks: ["Galaxy", "Gate 2"],
    regularFare: 51.5,
    discountedFare: 41.25,
    coordinates: { lat: 14.7750, lng: 120.9310 },
  },
  {
    pointNumber: 23,
    code: "GATE1",
    name: "Enter City (Gate 1)",
    landmarks: ["Cruz sa Wawa", "Gate 1", "BDO", "SSS", "Golden Aub"],
    regularFare: 53.75,
    discountedFare: 43.0,
    coordinates: { lat: 14.7700, lng: 120.9370 },
  },
  {
    pointNumber: 24,
    code: "WAKAS",
    name: "Wakas",
    landmarks: ["Yanga", "Wakas Terminal", "BPI", "Metrobank", "Palengke", "Crossing"],
    regularFare: 55.75,
    discountedFare: 44.75,
    coordinates: { lat: 14.7660, lng: 120.9430 },
  },
  {
    pointNumber: 25,
    code: "BINNG",
    name: "Binang",
    landmarks: ["Sto Nino", "Shell", "Igolot", "BDO", "Puregold", "Tawiran", "JIL"],
    regularFare: 58.0,
    discountedFare: 46.5,
    coordinates: { lat: 14.7610, lng: 120.9490 },
  },
  {
    pointNumber: 26,
    code: "BONLO",
    name: "Bonlo",
    landmarks: ["Barangay Hall", "Petron", "Joners", "McDo"],
    regularFare: 60.25,
    discountedFare: 48.25,
    coordinates: { lat: 14.7570, lng: 120.9540 },
  },
  {
    pointNumber: 27,
    code: "LOLMB",
    name: "Lolomboy",
    landmarks: ["Caltex", "LTO", "Specialist", "Honda"],
    regularFare: 62.5,
    discountedFare: 50.0,
    coordinates: { lat: 14.7530, lng: 120.9580 },
  },
  {
    pointNumber: 28,
    code: "TOYOT",
    name: "Toyota / Marilao",
    landmarks: ["Sabungan", "Socorro", "PDM", "Decca", "Dating Petron"],
    regularFare: 64.5,
    discountedFare: 51.75,
    coordinates: { lat: 14.7490, lng: 120.9630 },
  },
  {
    pointNumber: 29,
    code: "CRMLA",
    name: "Crossing Marilao",
    landmarks: ["Ford", "Tulay"],
    regularFare: 66.75,
    discountedFare: 53.5,
    coordinates: { lat: 14.7470, lng: 120.9680 },
  },
  {
    pointNumber: 30,
    code: "SMMRL",
    name: "SM Marilao",
    landmarks: ["Saog", "Lias", "Nazareno", "Medallion"],
    regularFare: 69.0,
    discountedFare: 55.25,
    coordinates: { lat: 14.7450, lng: 120.9740 },
  },
  {
    pointNumber: 31,
    code: "PNDYN",
    name: "Pandayan",
    landmarks: ["C Fuel", "7-Eleven", "Iglesia"],
    regularFare: 71.25,
    discountedFare: 57.0,
    coordinates: { lat: 14.7420, lng: 120.9800 },
  },
  {
    pointNumber: 32,
    code: "MEYCA",
    name: "Meycauayan",
    landmarks: ["City Hall", "Crossing", "MC", "Metrobank"],
    regularFare: 73.5,
    discountedFare: 58.75,
    coordinates: { lat: 14.7390, lng: 120.9860 },
  },
  {
    pointNumber: 33,
    code: "BANGA",
    name: "Banga",
    landmarks: ["STI", "Petron"],
    regularFare: 75.5,
    discountedFare: 60.5,
    coordinates: { lat: 14.7350, lng: 120.9920 },
  },
];

// ─── Fare-by-Barangay-Count Lookup ─────────────────────────────────────
//
// The fare depends ONLY on how many barangays are traversed, not on which
// specific barangays. This table maps barangay count → fare.
// Derived directly from the cooperative's official fare matrix image.
//
// Example: Traveling through 6 barangays (e.g., Calumpit → Longos) costs ₱16.25.
// The same fare applies for any 6-barangay trip (e.g., Borneo → CEU).

const FARE_BY_BARANGAY_COUNT_REGULAR: Record<number, number> = {
  1: 15.0,
  2: 15.0,
  3: 15.0,
  4: 15.0,
  5: 15.0,
  6: 16.25,
  7: 18.5,
  8: 20.75,
  9: 22.75,
  10: 25.0,
  11: 27.25,
  12: 29.5,
  13: 31.75,
  14: 33.75,
  15: 36.0,
  16: 38.25,
  17: 40.5,
  18: 42.75,
  19: 44.75,
  20: 47.0,
  21: 49.25,
  22: 51.5,
  23: 53.75,
  24: 55.75,
  25: 58.0,
  26: 60.25,
  27: 62.5,
  28: 64.5,
  29: 66.75,
  30: 69.0,
  31: 71.25,
  32: 73.5,
  33: 75.5,
};

const FARE_BY_BARANGAY_COUNT_DISCOUNTED: Record<number, number> = {
  1: 12.0,
  2: 12.0,
  3: 12.0,
  4: 12.0,
  5: 12.0,
  6: 13.0,
  7: 14.75,
  8: 16.5,
  9: 18.25,
  10: 20.0,
  11: 21.75,
  12: 23.5,
  13: 25.25,
  14: 27.0,
  15: 28.75,
  16: 30.5,
  17: 32.25,
  18: 34.25,
  19: 36.0,
  20: 37.75,
  21: 39.5,
  22: 41.25,
  23: 43.0,
  24: 44.75,
  25: 46.5,
  26: 48.25,
  27: 50.0,
  28: 51.75,
  29: 53.5,
  30: 55.25,
  31: 57.0,
  32: 58.75,
  33: 60.5,
};

// ─── Fare Configuration Constants ──────────────────────────────────────

export const FARE_CONFIG = {
  /** Base fare covers the first 4 barangays traveled */
  BASE_BARANGAY_COUNT: 4,
  /** Regular base fare (PHP) */
  BASE_FARE_REGULAR: 15.0,
  /** Discounted base fare (PHP) for Student / Senior / PWD */
  BASE_FARE_DISCOUNTED: 12.0,
  /** Approximate succeeding fare per barangay after the 4th (regular) */
  SUCCEEDING_FARE_REGULAR: 2.25,
  /** Approximate succeeding fare per barangay after the 4th (discounted) */
  SUCCEEDING_FARE_DISCOUNTED: 1.75,
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
 *   Regular fare: ₱16.25 (from FARE_BY_BARANGAY_COUNT table)
 *
 * The same fare of ₱16.25 applies for ANY 6-barangay trip regardless
 * of starting point (e.g., Borneo → CEU is also 6 barangays = ₱16.25).
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

  return fareTable[barangaysTraversed] ?? (isDiscounted ? 12.0 : 15.0);
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

