// lib/fare-calculator.ts
// Shared fare calculation with commuter-type discounts and GPS-based nearest-point lookup.

import {
  initialFarePoints,
  getFareByPoints,
  type FarePoint,
  type FareResult,
} from "./fare-matrix-data";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CommuterType =
  | "REGULAR"
  | "STUDENT"
  | "SENIOR_CITIZEN"
  | "PWD";

export interface FareCalculation {
  fareResult: FareResult;
  finalFare: number;
  hasDiscount: boolean;
  discountAmount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DISCOUNTED_TYPES = new Set<CommuterType>([
  "STUDENT",
  "SENIOR_CITIZEN",
  "PWD",
]);

const DISCOUNT_RATE = 0.2;

// ─── GPS Coordinates ─────────────────────────────────────────────────────────

interface PointCoordinate {
  pointNumber: number;
  latitude: number;
  longitude: number;
}

const POINT_COORDINATES: PointCoordinate[] = [
  { pointNumber: 1,  latitude: 14.7370, longitude: 120.9730 },
  { pointNumber: 2,  latitude: 14.7390, longitude: 120.9710 },
  { pointNumber: 3,  latitude: 14.7420, longitude: 120.9700 },
  { pointNumber: 4,  latitude: 14.7530, longitude: 120.9690 },
  { pointNumber: 5,  latitude: 14.7590, longitude: 120.9670 },
  { pointNumber: 6,  latitude: 14.7640, longitude: 120.9650 },
  { pointNumber: 7,  latitude: 14.7730, longitude: 120.9570 },
  { pointNumber: 8,  latitude: 14.7790, longitude: 120.9510 },
  { pointNumber: 9,  latitude: 14.7840, longitude: 120.9460 },
  { pointNumber: 10, latitude: 14.7880, longitude: 120.9400 },
  { pointNumber: 11, latitude: 14.7940, longitude: 120.9340 },
  { pointNumber: 12, latitude: 14.8000, longitude: 120.9280 },
  { pointNumber: 13, latitude: 14.8050, longitude: 120.9230 },
  { pointNumber: 14, latitude: 14.8100, longitude: 120.9170 },
  { pointNumber: 15, latitude: 14.8360, longitude: 120.9100 },
  { pointNumber: 16, latitude: 14.8420, longitude: 120.9050 },
  { pointNumber: 17, latitude: 14.8480, longitude: 120.9000 },
  { pointNumber: 18, latitude: 14.8530, longitude: 120.8950 },
  { pointNumber: 19, latitude: 14.8580, longitude: 120.8900 },
  { pointNumber: 20, latitude: 14.8440, longitude: 120.8830 },
  { pointNumber: 21, latitude: 14.8500, longitude: 120.8780 },
  { pointNumber: 22, latitude: 14.8560, longitude: 120.8730 },
  { pointNumber: 23, latitude: 14.8600, longitude: 120.8680 },
  { pointNumber: 24, latitude: 14.8630, longitude: 120.8630 },
  { pointNumber: 25, latitude: 14.8660, longitude: 120.8580 },
  { pointNumber: 26, latitude: 14.8700, longitude: 120.8530 },
  { pointNumber: 27, latitude: 14.8730, longitude: 120.8480 },
  { pointNumber: 28, latitude: 14.8780, longitude: 120.8400 },
  { pointNumber: 29, latitude: 14.8860, longitude: 120.8300 },
  { pointNumber: 30, latitude: 14.8930, longitude: 120.8220 },
  { pointNumber: 31, latitude: 14.9000, longitude: 120.8150 },
  { pointNumber: 32, latitude: 14.9070, longitude: 120.8080 },
  { pointNumber: 33, latitude: 14.9140, longitude: 120.8020 },
  { pointNumber: 34, latitude: 14.9210, longitude: 120.7960 },
];

// ─── Haversine Distance ──────────────────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function calculateFare(
  fromPointNumber: number,
  toPointNumber: number,
  commuterType: CommuterType
): FareCalculation {
  const fareResult = getFareByPoints(fromPointNumber, toPointNumber);

  const hasDiscount = DISCOUNTED_TYPES.has(commuterType);

  const baseAmount = hasDiscount ? fareResult.discountedFare : fareResult.regularFare;
  const discountAmount = hasDiscount
    ? Math.round((fareResult.regularFare - fareResult.discountedFare) * 100) / 100
    : 0;

  return {
    fareResult,
    finalFare: Math.round(baseAmount * 100) / 100,
    hasDiscount,
    discountAmount,
  };
}

export function getNearestPoint(
  latitude: number,
  longitude: number
): FarePoint {
  let nearestPoint: FarePoint = initialFarePoints[0];
  let minDistance = Infinity;

  for (const coord of POINT_COORDINATES) {
    const dist = haversineMeters(latitude, longitude, coord.latitude, coord.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      const farePoint = initialFarePoints.find(
        (p) => p.pointNumber === coord.pointNumber
      );
      if (farePoint) {
        nearestPoint = farePoint;
      }
    }
  }

  return nearestPoint;
}

export type { FarePoint, FareResult };

// ─── Utility Exports (used by commuter UI components) ───────────────────────

/** Format a number as Philippine peso string */
export function formatCurrency(amount: number): string {
  return `\u20B1${amount.toFixed(2)}`;
}

/** Get the display label for a commuter type */
export function getCommuterTypeLabel(type: CommuterType): string {
  const labels: Record<CommuterType, string> = {
    REGULAR: "Regular",
    STUDENT: "Student",
    SENIOR_CITIZEN: "Senior Citizen",
    PWD: "PWD",
  };
  return labels[type];
}