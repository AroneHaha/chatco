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
const MINIMUM_REGULAR_FARE = 17.0;
/** Minimum discounted fare (within base-fare zone — first 4 barangays) */
const MINIMUM_DISCOUNTED_FARE = 13.6;

/**
 * The base fare (₱17) covers the first 4 barangays traveled.
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
    regularFare: 77.5,
    discountedFare: 62.0,
  },
  {
    pointNumber: 2,
    name: "Puregold Jr Aliw / Meycauayan",
    regularFare: 75.5,
    discountedFare: 60.4,
  },
  {
    pointNumber: 3,
    name: "Pandayan",
    regularFare: 73.25,
    discountedFare: 58.6,
  },
  {
    pointNumber: 4,
    name: "SM Marilao",
    regularFare: 71.0,
    discountedFare: 56.8,
  },
  {
    pointNumber: 5,
    name: "Marilao Public Market",
    regularFare: 68.75,
    discountedFare: 55.0,
  },
  {
    pointNumber: 6,
    name: "Toyota Marilao / Abangan",
    regularFare: 66.5,
    discountedFare: 53.2,
  },
  {
    pointNumber: 7,
    name: "Lolomboy / Bocaue Specialist",
    regularFare: 64.5,
    discountedFare: 51.6,
  },
  {
    pointNumber: 8,
    name: "Petron Brgy Bonlo Bocaue",
    regularFare: 62.25,
    discountedFare: 49.8,
  },
  {
    pointNumber: 9,
    name: "BDO Binang First Bocaue",
    regularFare: 60.0,
    discountedFare: 48.0,
  },
  {
    pointNumber: 10,
    name: "Bocaue Public Market",
    regularFare: 57.75,
    discountedFare: 46.2,
  },
  {
    pointNumber: 11,
    name: "Intercity Gate 1",
    regularFare: 55.75,
    discountedFare: 44.6,
  },
  {
    pointNumber: 12,
    name: "Inter City Gate 2 Balagtas",
    regularFare: 53.5,
    discountedFare: 42.8,
  },
  {
    pointNumber: 13,
    name: "Balagtas Municipal Hall",
    regularFare: 51.25,
    discountedFare: 41.0,
  },
  {
    pointNumber: 14,
    name: "STI Colleges Brgy Burol 1st",
    regularFare: 49.0,
    discountedFare: 39.2,
  },
  {
    pointNumber: 15,
    name: "Tuktukan Gas Station Guiguinto",
    regularFare: 46.75,
    discountedFare: 37.4,
  },
  {
    pointNumber: 16,
    name: "Guiguinto Cruz / Puregold G",
    regularFare: 44.75,
    discountedFare: 35.8,
  },
  {
    pointNumber: 17,
    name: "Waltermart Guiguinto",
    regularFare: 42.5,
    discountedFare: 34.0,
  },
  {
    pointNumber: 18,
    name: "TESDA / Estrella",
    regularFare: 40.25,
    discountedFare: 32.2,
  },
  {
    pointNumber: 19,
    name: "Tabang / Tulay Guiguinto",
    regularFare: 38.0,
    discountedFare: 30.4,
  },
  {
    pointNumber: 20,
    name: "Tikay Elementary School Malolos",
    regularFare: 35.75,
    discountedFare: 28.6,
  },
  {
    pointNumber: 21,
    name: "San Pablo Malolos / Crossing",
    regularFare: 33.75,
    discountedFare: 27.0,
  },
  {
    pointNumber: 22,
    name: "Paradise / Marcelo / SNR",
    regularFare: 31.5,
    discountedFare: 25.2,
  },
  {
    pointNumber: 23,
    name: "STI / Dakila",
    regularFare: 29.25,
    discountedFare: 23.4,
  },
  {
    pointNumber: 24,
    name: "Sunlife Malolos Crossing",
    regularFare: 27.0,
    discountedFare: 21.6,
  },
  {
    pointNumber: 25,
    name: "BSU / Kapitolyo",
    regularFare: 24.75,
    discountedFare: 19.8,
  },
  {
    pointNumber: 26,
    name: "Builders Warehouse Alido",
    regularFare: 22.75,
    discountedFare: 18.2,
  },
  {
    pointNumber: 27,
    name: "Central Escolar CEU Malolos",
    regularFare: 20.5,
    discountedFare: 16.4,
  },
  {
    pointNumber: 28,
    name: "MBB Royal Hardware Longos",
    regularFare: 18.25,
    discountedFare: 14.6,
    subStops: ["MBB Royal", "Vista", "Walter", "Heritage"],
  },
  {
    pointNumber: 29,
    name: "Wilcon Depot / Pio Calumpit",
    regularFare: 17.0,
    discountedFare: 13.6,
  },
  {
    pointNumber: 30,
    name: "San Marcos / Brgy Pio Cruzc",
    regularFare: 17.0,
    discountedFare: 13.6,
  },
  {
    pointNumber: 31,
    name: "Petron Gas Station Bagbag",
    regularFare: 17.0,
    discountedFare: 13.6,
  },
  {
    pointNumber: 32,
    name: "Labangan Bridge Calumpit",
    regularFare: 17.0,
    discountedFare: 13.6,
  },
  {
    pointNumber: 33,
    name: "Calumpit Crossing Jollibee",
    regularFare: 17.0,
    discountedFare: 13.6,
  },
  {
    pointNumber: 34,
    name: "JEDS Island Resort",
    regularFare: 17.0,
    discountedFare: 13.6,
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
    regularFare: 17.0,
    discountedFare: 13.6,
    coordinates: { lat: 14.9260, lng: 120.7680 },
  },
  {
    pointNumber: 2,
    code: "CI",
    name: "C.I. (Colegio de Calumpit)",
    landmarks: ["ASM"],
    regularFare: 17.0,
    discountedFare: 13.6,
    coordinates: { lat: 14.9240, lng: 120.7710 },
  },
  {
    pointNumber: 3,
    code: "BAGBG",
    name: "Bagbag",
    landmarks: ["UPPC", "Petron", "Xebron", "Phoenix"],
    regularFare: 17.0,
    discountedFare: 13.6,
    coordinates: { lat: 14.9200, lng: 120.7740 },
  },
  {
    pointNumber: 4,
    code: "SMARC",
    name: "San Marcos",
    landmarks: ["PEO", "Lares", "Dream Oil"],
    regularFare: 17.0,
    discountedFare: 13.6,
    coordinates: { lat: 14.9140, lng: 120.7780 },
  },
  {
    pointNumber: 5,
    code: "BORNE",
    name: "Borneo",
    landmarks: ["Gardenville", "Metropolis", "Lexber", "McArthur"],
    regularFare: 17.0,
    discountedFare: 13.6,
    coordinates: { lat: 14.9070, lng: 120.7820 },
  },
  {
    pointNumber: 6,
    code: "LONGS",
    name: "Longos",
    landmarks: ["MBB Royal", "Vista", "Walter", "Heritage"],
    regularFare: 18.25,
    discountedFare: 14.6,
    coordinates: { lat: 14.8930, lng: 120.7910 },
  },
  {
    pointNumber: 7,
    code: "CEU",
    name: "CEU",
    landmarks: ["South", "Grand Royal"],
    regularFare: 20.5,
    discountedFare: 16.4,
    coordinates: { lat: 14.8860, lng: 120.7970 },
  },
  {
    pointNumber: 8,
    code: "BLDRS",
    name: "Builders",
    landmarks: ["BPC", "Alido", "City Hall", "Pure Gold"],
    regularFare: 22.75,
    discountedFare: 18.2,
    coordinates: { lat: 14.8780, lng: 120.8040 },
  },
  {
    pointNumber: 9,
    code: "BSU",
    name: "BSU",
    landmarks: ["Xentromall", "Graceland", "Kapitolyo"],
    regularFare: 24.75,
    discountedFare: 19.8,
    coordinates: { lat: 14.8700, lng: 120.8130 },
  },
  {
    pointNumber: 10,
    code: "CROML",
    name: "Crossing Malolos",
    landmarks: ["Pag-IBIG", "Robinsons", "Grand Town", "Landbank"],
    regularFare: 27.0,
    discountedFare: 21.6,
    coordinates: { lat: 14.8620, lng: 120.8210 },
  },
  {
    pointNumber: 11,
    code: "STIML",
    name: "S.T.I.",
    landmarks: ["Rapids", "Gramman", "Dakila"],
    regularFare: 29.25,
    discountedFare: 23.4,
    coordinates: { lat: 14.8540, lng: 120.8300 },
  },
  {
    pointNumber: 12,
    code: "MARCL",
    name: "Marcelo",
    landmarks: ["Paradise", "S&R", "Madera"],
    regularFare: 31.5,
    discountedFare: 25.2,
    coordinates: { lat: 14.8460, lng: 120.8400 },
  },
  {
    pointNumber: 13,
    code: "SNPBL",
    name: "San Pablo",
    landmarks: ["Ford", "Stoplight", "Kanto Malit", "Pastry"],
    regularFare: 33.75,
    discountedFare: 27.0,
    coordinates: { lat: 14.8380, lng: 120.8510 },
  },
  {
    pointNumber: 14,
    code: "TIKAY",
    name: "Tikay",
    landmarks: ["DPHW", "School", "NFA", "Industrial", "Caltex", "Jollibee"],
    regularFare: 35.75,
    discountedFare: 28.6,
    coordinates: { lat: 14.8300, lng: 120.8620 },
  },
  {
    pointNumber: 15,
    code: "TABNG",
    name: "Tabang",
    landmarks: ["Eurobake", "Tulay", "Tawiran"],
    regularFare: 38.0,
    discountedFare: 30.4,
    coordinates: { lat: 14.8220, lng: 120.8730 },
  },
  {
    pointNumber: 16,
    code: "TESDA",
    name: "TESDA",
    landmarks: ["Junkshop", "LTO Masagana", "Ajinomoto", "Iral", "Estrella", "Mighty"],
    regularFare: 40.25,
    discountedFare: 32.2,
    coordinates: { lat: 14.8140, lng: 120.8830 },
  },
  {
    pointNumber: 17,
    code: "ILANG",
    name: "Ilang-Ilang",
    landmarks: ["Aldea", "Walter", "Church", "Munisipyo", "Agatha Square"],
    regularFare: 42.5,
    discountedFare: 34.0,
    coordinates: { lat: 14.8060, lng: 120.8930 },
  },
  {
    pointNumber: 18,
    code: "CRUZ",
    name: "Cruz",
    landmarks: ["Builders", "Honda", "Buslo", "Unitop", "Divimart"],
    regularFare: 44.75,
    discountedFare: 35.8,
    coordinates: { lat: 14.7980, lng: 120.9030 },
  },
  {
    pointNumber: 19,
    code: "TUKTK",
    name: "Tuktukan",
    landmarks: ["Orovilla", "Brgy Hall", "Patubig", "Russi", "AFA", "San Pablo St", "Wilcon"],
    regularFare: 46.75,
    discountedFare: 37.4,
    coordinates: { lat: 14.7910, lng: 120.9100 },
  },
  {
    pointNumber: 20,
    code: "SAPRO",
    name: "SAPRO / STI",
    landmarks: ["Palmera", "Pascual", "Honda", "Rocka"],
    regularFare: 49.0,
    discountedFare: 39.2,
    coordinates: { lat: 14.7850, lng: 120.9170 },
  },
  {
    pointNumber: 21,
    code: "BALGT",
    name: "Balagtas",
    landmarks: ["Petron/Ultra", "Meralco", "Mariano", "Palengke", "Munisipyo", "San Juan/Sabungan"],
    regularFare: 51.25,
    discountedFare: 41.0,
    coordinates: { lat: 14.7800, lng: 120.9240 },
  },
  {
    pointNumber: 22,
    code: "GATE2",
    name: "Enter City (Gate 2)",
    landmarks: ["Galaxy", "Gate 2"],
    regularFare: 53.5,
    discountedFare: 42.8,
    coordinates: { lat: 14.7750, lng: 120.9310 },
  },
  {
    pointNumber: 23,
    code: "GATE1",
    name: "Enter City (Gate 1)",
    landmarks: ["Cruz sa Wawa", "Gate 1", "BDO", "SSS", "Golden Aub"],
    regularFare: 55.75,
    discountedFare: 44.6,
    coordinates: { lat: 14.7700, lng: 120.9370 },
  },
  {
    pointNumber: 24,
    code: "WAKAS",
    name: "Wakas",
    landmarks: ["Yanga", "Wakas Terminal", "BPI", "Metrobank", "Palengke", "Crossing"],
    regularFare: 57.75,
    discountedFare: 46.2,
    coordinates: { lat: 14.7660, lng: 120.9430 },
  },
  {
    pointNumber: 25,
    code: "BINNG",
    name: "Binang",
    landmarks: ["Sto Nino", "Shell", "Igolot", "BDO", "Puregold", "Tawiran", "JIL"],
    regularFare: 60.0,
    discountedFare: 48.0,
    coordinates: { lat: 14.7610, lng: 120.9490 },
  },
  {
    pointNumber: 26,
    code: "BONLO",
    name: "Bonlo",
    landmarks: ["Barangay Hall", "Petron", "Joners", "McDo"],
    regularFare: 62.25,
    discountedFare: 49.8,
    coordinates: { lat: 14.7570, lng: 120.9540 },
  },
  {
    pointNumber: 27,
    code: "LOLMB",
    name: "Lolomboy",
    landmarks: ["Caltex", "LTO", "Specialist", "Honda"],
    regularFare: 64.5,
    discountedFare: 51.6,
    coordinates: { lat: 14.7530, lng: 120.9580 },
  },
  {
    pointNumber: 28,
    code: "TOYOT",
    name: "Toyota / Marilao",
    landmarks: ["Sabungan", "Socorro", "PDM", "Decca", "Dating Petron"],
    regularFare: 66.5,
    discountedFare: 53.2,
    coordinates: { lat: 14.7490, lng: 120.9630 },
  },
  {
    pointNumber: 29,
    code: "CRMLA",
    name: "Crossing Marilao",
    landmarks: ["Ford", "Tulay"],
    regularFare: 68.75,
    discountedFare: 55.0,
    coordinates: { lat: 14.7470, lng: 120.9680 },
  },
  {
    pointNumber: 30,
    code: "SMMRL",
    name: "SM Marilao",
    landmarks: ["Saog", "Lias", "Nazareno", "Medallion"],
    regularFare: 71.0,
    discountedFare: 56.8,
    coordinates: { lat: 14.7450, lng: 120.9740 },
  },
  {
    pointNumber: 31,
    code: "PNDYN",
    name: "Pandayan",
    landmarks: ["C Fuel", "7-Eleven", "Iglesia"],
    regularFare: 73.25,
    discountedFare: 58.6,
    coordinates: { lat: 14.7420, lng: 120.9800 },
  },
  {
    pointNumber: 32,
    code: "MEYCA",
    name: "Meycauayan",
    landmarks: ["City Hall", "Crossing", "MC", "Metrobank"],
    regularFare: 75.5,
    discountedFare: 60.4,
    coordinates: { lat: 14.7390, lng: 120.9860 },
  },
  {
    pointNumber: 33,
    code: "BANGA",
    name: "Banga",
    landmarks: ["STI", "Petron"],
    regularFare: 77.5,
    discountedFare: 62.0,
    coordinates: { lat: 14.7350, lng: 120.9920 },
  },
];

// ─── Fare-by-Barangay-Count Lookup ─────────────────────────────────────
//
// The fare depends ONLY on how many barangays are traversed, not on which
// specific barangays. This table maps barangay count → fare.
// Derived directly from the cooperative's official fare matrix image.
//
// Example: Traveling through 6 barangays (e.g., Calumpit → Longos) costs ₱18.25.
// The same fare applies for any 6-barangay trip (e.g., Borneo → CEU).

const FARE_BY_BARANGAY_COUNT_REGULAR: Record<number, number> = {
  1: 17.0,
  2: 17.0,
  3: 17.0,
  4: 17.0,
  5: 17.0,
  6: 18.25,
  7: 20.5,
  8: 22.75,
  9: 24.75,
  10: 27.0,
  11: 29.25,
  12: 31.5,
  13: 33.75,
  14: 35.75,
  15: 38.0,
  16: 40.25,
  17: 42.5,
  18: 44.75,
  19: 46.75,
  20: 49.0,
  21: 51.25,
  22: 53.5,
  23: 55.75,
  24: 57.75,
  25: 60.0,
  26: 62.25,
  27: 64.5,
  28: 66.5,
  29: 68.75,
  30: 71.0,
  31: 73.25,
  32: 75.5,
  33: 77.5,
};

const FARE_BY_BARANGAY_COUNT_DISCOUNTED: Record<number, number> = {
  1: 13.6,
  2: 13.6,
  3: 13.6,
  4: 13.6,
  5: 13.6,
  6: 14.6,
  7: 16.4,
  8: 18.2,
  9: 19.8,
  10: 21.6,
  11: 23.4,
  12: 25.2,
  13: 27.0,
  14: 28.6,
  15: 30.4,
  16: 32.2,
  17: 34.0,
  18: 35.8,
  19: 37.4,
  20: 39.2,
  21: 41.0,
  22: 42.8,
  23: 44.6,
  24: 46.2,
  25: 48.0,
  26: 49.8,
  27: 51.6,
  28: 53.2,
  29: 55.0,
  30: 56.8,
  31: 58.6,
  32: 60.4,
  33: 62.0,
};

// ─── Fare Configuration Constants ──────────────────────────────────────

export const FARE_CONFIG = {
  /** Base fare covers the first 4 barangays traveled */
  BASE_BARANGAY_COUNT: 4,
  /** Regular base fare (PHP) */
  BASE_FARE_REGULAR: 17.0,
  /** Discounted base fare (PHP) for Student / Senior / PWD */
  BASE_FARE_DISCOUNTED: 13.6,
  /** Approximate succeeding fare per barangay after the 4th (regular) */
  SUCCEEDING_FARE_REGULAR: 2.25,
  /** Approximate succeeding fare per barangay after the 4th (discounted) */
  SUCCEEDING_FARE_DISCOUNTED: 1.8,
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
 *   Regular fare: ₱18.25 (from FARE_BY_BARANGAY_COUNT table)
 *
 * The same fare of ₱18.25 applies for ANY 6-barangay trip regardless
 * of starting point (e.g., Borneo → CEU is also 6 barangays = ₱18.25).
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

  return fareTable[barangaysTraversed] ?? (isDiscounted ? 13.6 : 17.0);
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

