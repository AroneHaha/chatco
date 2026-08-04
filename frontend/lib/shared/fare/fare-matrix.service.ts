// lib/shared/fare/fare-matrix.service.ts
//
// API-backed fare matrix service — the SINGLE SOURCE OF TRUTH for fare
// calculation in the frontend.
//
// Architecture:
//   - On first call, fetches the fare matrix from GET /api/fare-matrix
//     (which proxies to Laravel's public GET /api/v1/fare-matrix).
//   - Caches the result in memory for the session (fares don't change often).
//   - Falls back to the hardcoded fare-matrix-data.ts if the API is
//     unreachable (e.g. backend down during development).
//   - Provides the same functions as the hardcoded file (getFareByPoints,
//     getFareBetween, getBarangaysTraversed, FARE_CONFIG, FARE_MATRIX) so
//     it's a drop-in replacement.
//
// The admin's /settings/fare-matrix page edits the fare_points table;
// changes are immediately visible to all consumers on their next fetch
// (or on page refresh, since the cache is per-session).

import {
  initialFarePoints,
  getFareByPoints as hardcodedGetFareByPoints,
  getFareBetween as hardcodedGetFareBetween,
  getBarangaysTraversed as hardcodedGetBarangaysTraversed,
  FARE_CONFIG as HARDCODED_FARE_CONFIG,
  FARE_MATRIX as HARDCODED_FARE_MATRIX,
  type FarePoint,
  type FareResult,
} from "./fare-matrix-data";

// ─── Types (re-exported from the hardcoded file for compatibility) ───

export type { FarePoint, FareResult };

/** Extended point with landmarks + coordinates (for the pickup/dropoff selector UI). */
export interface PointArea {
  id?: string;
  pointNumber: number;
  name: string;
  code: string;
  landmarks: string[];
  /** Admin-managed pickup/drop-off choices that share this Point Area's fare. */
  subStops?: string[];
  coordinates: { lat: number; lng: number };
  regularFare: number;
  discountedFare: number;
}

export interface FareConfig {
  baseBarangayCount: number;
  baseFareRegular: number;
  baseFareDiscounted: number;
  succeedingFareRegular: number;
  succeedingFareDiscounted: number;
  totalPoints: number;
}

// ─── API response shape ───

interface ApiFarePoint {
  id: string;
  pointNumber: number;
  code: string;
  name: string;
  landmarks: string[];
  subStops: string[];
  regularFare: number;
  discountedFare: number;
  latitude: number | null;
  longitude: number | null;
  route: string | null;
}

interface ApiFareMatrixResponse {
  points: ApiFarePoint[];
  config: {
    baseBarangayCount: number;
    baseFareRegular: number;
    baseFareDiscounted: number;
    succeedingFareRegular: number;
    succeedingFareDiscounted: number;
    totalPoints: number;
  };
}

// ─── In-memory cache ───

let cachedPoints: FarePoint[] | null = null;
let cachedPointAreas: PointArea[] | null = null;
let cachedConfig: FareConfig | null = null;
let fetchPromise: Promise<void> | null = null;

// ─── Fetch + cache ───

/**
 * Fetch the fare matrix from the API + cache it. Safe to call multiple times —
 * concurrent calls share the same fetch promise.
 *
 * On failure, falls back to the hardcoded fare-matrix-data.ts so the UI
 * always has fare data (even if the backend is down).
 */
export async function loadFareMatrix(): Promise<void> {
  if (cachedPoints && cachedConfig) return; // already loaded
  if (fetchPromise) return fetchPromise; // fetch in progress

  fetchPromise = (async () => {
    try {
      const res = await fetch("/api/fare-matrix", {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const data = json.data as ApiFareMatrixResponse | null;

      if (!data || !Array.isArray(data.points) || data.points.length === 0) {
        throw new Error("Empty fare matrix response");
      }

      // Map API points → FarePoint (cumulative fare model)
      cachedPoints = data.points.map(p => ({
        pointNumber: p.pointNumber,
        name: p.name,
        regularFare: p.regularFare,
        discountedFare: p.discountedFare,
        subStops: p.subStops ?? [],
      }));

      // Map API points → PointArea (for the pickup/dropoff selector UI)
      cachedPointAreas = data.points.map(p => ({
        id: p.id,
        pointNumber: p.pointNumber,
        name: p.name,
        code: p.code,
        landmarks: p.landmarks ?? [],
        subStops: p.subStops ?? [],
        coordinates: {
          lat: p.latitude ?? 0,
          lng: p.longitude ?? 0,
        },
        regularFare: p.regularFare,
        discountedFare: p.discountedFare,
      }));

      // Map config
      cachedConfig = {
        baseBarangayCount: data.config.baseBarangayCount ?? 4,
        baseFareRegular: data.config.baseFareRegular ?? 15.0,
        baseFareDiscounted: data.config.baseFareDiscounted ?? 12.0,
        succeedingFareRegular: data.config.succeedingFareRegular ?? 2.25,
        succeedingFareDiscounted: data.config.succeedingFareDiscounted ?? 1.75,
        totalPoints: data.config.totalPoints ?? data.points.length,
      };
    } catch {
      // Fallback to the hardcoded data — the UI still works, just with
      // potentially stale fares until the backend is back.
      cachedPoints = initialFarePoints;
      cachedPointAreas = HARDCODED_FARE_MATRIX;
      cachedConfig = {
        baseBarangayCount: HARDCODED_FARE_CONFIG.BASE_BARANGAY_COUNT,
        baseFareRegular: HARDCODED_FARE_CONFIG.BASE_FARE_REGULAR,
        baseFareDiscounted: HARDCODED_FARE_CONFIG.BASE_FARE_DISCOUNTED,
        succeedingFareRegular: HARDCODED_FARE_CONFIG.SUCCEEDING_FARE_REGULAR,
        succeedingFareDiscounted: HARDCODED_FARE_CONFIG.SUCCEEDING_FARE_DISCOUNTED,
        totalPoints: HARDCODED_FARE_CONFIG.TOTAL_BARANGAYS,
      };
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

// ─── Synchronous accessors (use after loadFareMatrix has resolved) ───

/**
 * Returns the cached fare points. Throws if loadFareMatrix hasn't been called
 * yet — but falls back to the hardcoded data defensively.
 */
export function getFarePoints(): FarePoint[] {
  return cachedPoints ?? initialFarePoints;
}

/**
 * Returns the cached point areas (for the pickup/dropoff selector UI).
 * Falls back to the hardcoded FARE_MATRIX defensively.
 */
export function getPointAreas(): PointArea[] {
  return cachedPointAreas ?? HARDCODED_FARE_MATRIX;
}

/**
 * Returns the cached fare config. Falls back to the hardcoded FARE_CONFIG.
 */
export function getFareConfig(): FareConfig {
  return cachedConfig ?? {
    baseBarangayCount: HARDCODED_FARE_CONFIG.BASE_BARANGAY_COUNT,
    baseFareRegular: HARDCODED_FARE_CONFIG.BASE_FARE_REGULAR,
    baseFareDiscounted: HARDCODED_FARE_CONFIG.BASE_FARE_DISCOUNTED,
    succeedingFareRegular: HARDCODED_FARE_CONFIG.SUCCEEDING_FARE_REGULAR,
    succeedingFareDiscounted: HARDCODED_FARE_CONFIG.SUCCEEDING_FARE_DISCOUNTED,
    totalPoints: HARDCODED_FARE_CONFIG.TOTAL_BARANGAYS,
  };
}

// ─── Fare calculation (uses cached API data, falls back to hardcoded) ───

/**
 * Calculate fare between two points using the CUMULATIVE FARE MODEL.
 *
 * The fare_points table stores regular_fare and discounted_fare as
 * CUMULATIVE fares from the terminal (Point 34 = ₱0). The fare between
 * any two points is:
 *   abs(from.regularFare - to.regularFare)
 * floored at the minimum fare.
 *
 * This matches the backend's fare_points table structure — the admin's
 * /settings/fare-matrix edits directly affect this calculation.
 */
export function getFareByPoints(fromPointNumber: number, toPointNumber: number): FareResult {
  const points = getFarePoints();
  const fromPoint = points.find(p => p.pointNumber === fromPointNumber);
  const toPoint = points.find(p => p.pointNumber === toPointNumber);

  if (!fromPoint || !toPoint) {
    // Fallback to the hardcoded implementation (which has the same logic
    // but uses its own data set).
    return hardcodedGetFareByPoints(fromPointNumber, toPointNumber);
  }

  const barangaysTraveled = Math.abs(fromPointNumber - toPointNumber);
  const config = getFareConfig();

  if (barangaysTraveled === 0) {
    return {
      fromPoint,
      toPoint,
      barangaysTraveled: 0,
      regularFare: config.baseFareRegular,
      discountedFare: config.baseFareDiscounted,
      baseFare: config.baseFareRegular,
      succeedingFare: config.succeedingFareRegular,
      succeedingCount: 0,
    };
  }

  // Cumulative fare difference — this is the KEY calculation.
  // The fare_points table stores fares as cumulative from the terminal,
  // so the fare between two points is the absolute difference.
  const rawRegularFare = Math.abs(fromPoint.regularFare - toPoint.regularFare);
  const rawDiscountedFare = Math.abs(fromPoint.discountedFare - toPoint.discountedFare);

  // Floor at the minimum fare (base fare for the first zone).
  const regularFare = Math.max(rawRegularFare, config.baseFareRegular);
  const discountedFare = Math.max(rawDiscountedFare, config.baseFareDiscounted);

  const succeedingCount = Math.max(0, barangaysTraveled - config.baseBarangayCount);

  return {
    fromPoint,
    toPoint,
    barangaysTraveled,
    regularFare: Math.round(regularFare * 100) / 100,
    discountedFare: Math.round(discountedFare * 100) / 100,
    baseFare: config.baseFareRegular,
    succeedingFare: config.succeedingFareRegular,
    succeedingCount,
  };
}

/**
 * Calculate fare between two points by position number.
 * Uses the cumulative fare model (same as getFareByPoints).
 *
 * @param isDiscounted true for Student / Senior / PWD
 */
export function getFareBetween(
  originPosition: number,
  destinationPosition: number,
  isDiscounted: boolean
): number {
  const result = getFareByPoints(originPosition, destinationPosition);
  return isDiscounted ? result.discountedFare : result.regularFare;
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
