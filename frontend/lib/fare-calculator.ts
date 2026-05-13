// lib/fare-calculator.ts
// Shared fare calculation functions using barangay-based progression model
//
// FARE LOGIC:
// - Fare computation is NOT based on GPS distance
// - The system follows a BARANGAY-BASED FARE PROGRESSION MODEL:
//   * The first four (4) barangays traveled are covered by the base fare
//   * Every succeeding barangay after the fourth is treated as one (1)
//     succeeding kilometer or fare increment
//   * This applies regardless of route direction or starting point
// - Actual fare amounts come from the cooperative's official fare matrix
//   (stored in FARE_BY_BARANGAY_COUNT lookup tables)

import {
  FARE_MATRIX,
  FARE_CONFIG,
  getPointByNumber,
  getFareBetween,
  getBarangaysTraversed,
  getFareExplanation,
  findNearestPoint,
  type PointArea,
} from "./fare-matrix-data";

export type CommuterType = "REGULAR" | "STUDENT" | "SENIOR_CITIZEN" | "PWD";

export interface FareBreakdown {
  pickupPoint: PointArea;
  dropoffPoint: PointArea;
  isDiscounted: boolean;
  baseFare: number;
  fare: number;
  discountAmount: number;
  regularFare: number;
  discountedFare: number;
  /** How many barangays are traversed in this trip */
  barangaysTraversed: number;
  /** Human-readable explanation of the fare computation */
  fareExplanation: string;
  /** How many barangays are covered by base fare */
  baseBarangayCount: number;
  /** How many succeeding barangays beyond the base */
  succeedingBarangays: number;
}

/**
 * Calculate fare between two barangays.
 * Returns a full breakdown including barangay count, discount info,
 * and fare explanation.
 *
 * Example:
 *   Origin: Calumpit (position 1)
 *   Destination: Longos (position 6)
 *   Barangays traversed: 6
 *   First 4 barangays: covered by base fare (₱15.00)
 *   2 succeeding barangays: added on top
 *   Total fare: ₱16.25 (regular)
 */
export function calculateFare(
  originPosition: number,
  destinationPosition: number,
  commuterType: CommuterType
): FareBreakdown | null {
  const pickupPoint = getPointByNumber(originPosition);
  const dropoffPoint = getPointByNumber(destinationPosition);

  if (!pickupPoint || !dropoffPoint) return null;

  const isDiscounted =
    commuterType === "STUDENT" ||
    commuterType === "SENIOR_CITIZEN" ||
    commuterType === "PWD";

  const regularFare = getFareBetween(originPosition, destinationPosition, false);
  const discountedFare = getFareBetween(originPosition, destinationPosition, true);
  const fare = isDiscounted ? discountedFare : regularFare;
  const baseFare = isDiscounted
    ? FARE_CONFIG.BASE_FARE_DISCOUNTED
    : FARE_CONFIG.BASE_FARE_REGULAR;
  const discountAmount = regularFare - discountedFare;
  const barangaysCount = getBarangaysTraversed(originPosition, destinationPosition);
  const explanation = getFareExplanation(originPosition, destinationPosition);
  const succeedingBarangays = Math.max(0, barangaysCount - FARE_CONFIG.BASE_BARANGAY_COUNT);

  return {
    pickupPoint,
    dropoffPoint,
    isDiscounted,
    baseFare,
    fare,
    discountAmount,
    regularFare,
    discountedFare,
    barangaysTraversed: barangaysCount,
    fareExplanation: explanation,
    baseBarangayCount: FARE_CONFIG.BASE_BARANGAY_COUNT,
    succeedingBarangays,
  };
}

/** Format a number as Philippine peso string: ₱75.50 */
export function formatCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

/** Get display name for a barangay by its position number */
export function getPointAreaName(pointNumber: number): string {
  const point = getPointByNumber(pointNumber);
  return point ? point.name : "Unknown";
}

/** Get all barangays for selector UI */
export function getAllPointAreas(): PointArea[] {
  return FARE_MATRIX;
}

/** Detect the nearest barangay to a given GPS location */
export function detectNearestPoint(lat: number, lng: number): PointArea {
  return findNearestPoint(lat, lng);
}

/** Get the commuter type label for display */
export function getCommuterTypeLabel(type: CommuterType): string {
  const labels: Record<CommuterType, string> = {
    REGULAR: "Regular",
    STUDENT: "Student",
    SENIOR_CITIZEN: "Senior Citizen",
    PWD: "PWD",
  };
  return labels[type];
}

/** Get the commuter type discount label for display */
export function getCommuterTypeDiscountLabel(type: CommuterType): string {
  if (type === "REGULAR") return "";
  if (type === "STUDENT") return "20% Student Discount";
  if (type === "SENIOR_CITIZEN") return "20% Senior Discount";
  if (type === "PWD") return "20% PWD Discount";
  return "";
}
