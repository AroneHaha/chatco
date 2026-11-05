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
  /** Percent off the regular fare for Student / Senior Citizen / PWD. */
  discountRate: number;
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
    discountRate?: number;
    totalPoints: number;
  };
}

// ─── In-memory cache ───

let cachedPoints: FarePoint[] | null = null;
let cachedPointAreas: PointArea[] | null = null;
let cachedConfig: FareConfig | null = null;
let cachedRouteKey: string | null = null;
let fetchPromise: Promise<void> | null = null;

// ─── Fetch + cache ───

/**
 * Fetch the fare matrix from the API + cache it. Safe to call multiple times —
 * concurrent calls share the same fetch promise.
 *
 * On failure, falls back to the hardcoded fare-matrix-data.ts so the UI
 * always has fare data (even if the backend is down).
 */
interface LoadFareMatrixOptions {
  force?: boolean;
  routeId?: string;
}

export async function loadFareMatrix({
  force = false,
  routeId,
}: LoadFareMatrixOptions = {}): Promise<void> {
  const routeKey = routeId ?? "__default__";

  if (!force && cachedPoints && cachedConfig && cachedRouteKey === routeKey) {
    return;
  }

  // Let an existing request finish before starting a refresh for another
  // route. This prevents two responses from racing to overwrite the cache.
  if (fetchPromise) await fetchPromise;

  if (!force && cachedPoints && cachedConfig && cachedRouteKey === routeKey) {
    return;
  }

  fetchPromise = (async () => {
    try {
      const query = routeId
        ? `?route_id=${encodeURIComponent(routeId)}`
        : "";
      const res = await fetch(`/api/fare-matrix${query}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
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
        baseFareRegular: data.config.baseFareRegular ?? 17.0,
        baseFareDiscounted: data.config.baseFareDiscounted ?? 13.5,
        succeedingFareRegular: data.config.succeedingFareRegular ?? 2.4,
        succeedingFareDiscounted: data.config.succeedingFareDiscounted ?? 1.92,
        discountRate: data.config.discountRate ?? 20,
        totalPoints: data.config.totalPoints ?? data.points.length,
      };
      cachedRouteKey = routeKey;
    } catch {
      // A failed refresh keeps the last fares the backend gave for this
      // route; the hardcoded data is only for when nothing has loaded yet.
      if (cachedPoints && cachedConfig && cachedRouteKey === routeKey) return;

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
        discountRate: 20,
        totalPoints: HARDCODED_FARE_CONFIG.TOTAL_BARANGAYS,
      };
      cachedRouteKey = routeKey;
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
    discountRate: 20,
    totalPoints: HARDCODED_FARE_CONFIG.TOTAL_BARANGAYS,
  };
}

// ─── Fare calculation (uses cached API data, falls back to hardcoded) ───

/** The Financial Rules a fare is computed from (a subset of FareConfig). */
export type FareRuleValues = Pick<FareConfig, "baseFareRegular" | "baseBarangayCount" | "succeedingFareRegular" | "discountRate">;

/** Nearest ₱0.25; toFixed drops float noise such as 144.79999 before rounding. */
const toQuarter = (value: number) => Math.round(Number((value * 4).toFixed(6))) / 4;

/**
 * The one fare formula, same as the backend's App\Support\FareRules:
 *   regular    = minimum + max(0, barangays traversed - base count) × succeeding
 *   discounted = that amount less the discount rate
 * Both rounded to the nearest ₱0.25 with the discount taken before rounding,
 * as in the LTFRB jeepney matrix. Barangays traversed counts both ends:
 * |dropoff - pickup| + 1.
 */
export function fareForBarangays(rules: FareRuleValues, barangaysTraversed: number, discounted: boolean): number {
  const amount = rules.baseFareRegular + Math.max(0, barangaysTraversed - rules.baseBarangayCount) * rules.succeedingFareRegular;
  return toQuarter(discounted ? (amount * (100 - rules.discountRate)) / 100 : amount);
}

/**
 * Fare between two stops, priced from the Financial Rules (the stops' stored
 * fares are only their fare from stop 1 and are not used here).
 */
export function getFareByPoints(fromPointNumber: number, toPointNumber: number): FareResult {
  const find = (pointNumber: number) =>
    getFarePoints().find(p => p.pointNumber === pointNumber)
    ?? initialFarePoints.find(p => p.pointNumber === pointNumber);
  const fromPoint = find(fromPointNumber);
  const toPoint = find(toPointNumber);

  if (!fromPoint || !toPoint) {
    throw new Error(`Invalid point number: from=${fromPointNumber}, to=${toPointNumber}.`);
  }

  const config = getFareConfig();
  const barangaysTraveled = getBarangaysTraversed(fromPointNumber, toPointNumber);

  return {
    fromPoint,
    toPoint,
    barangaysTraveled,
    regularFare: fareForBarangays(config, barangaysTraveled, false),
    discountedFare: fareForBarangays(config, barangaysTraveled, true),
    baseFare: config.baseFareRegular,
    succeedingFare: config.succeedingFareRegular,
    succeedingCount: Math.max(0, barangaysTraveled - config.baseBarangayCount),
  };
}

/**
 * Calculate fare between two points by position number (see getFareByPoints).
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
