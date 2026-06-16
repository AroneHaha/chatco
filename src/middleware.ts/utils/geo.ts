/**
 * Shared geo utilities — single source of truth for Haversine distance.
 *
 * Used by:
 *   - lib/fare-calculator.ts (getNearestPoint)
 *   - lib/fare-matrix-data.ts (findNearestPoint)
 *   - lib/nearby-detector.ts (calculateDistance)
 *   - components/conductor/conductor-map.tsx (getDistanceMeters)
 *
 * All consumers should import from "@/lib/utils/geo".
 */

const EARTH_RADIUS_M = 6_371_000; // Earth's radius in meters

/**
 * Haversine formula — calculates the great-circle distance
 * between two lat/lng points on Earth.
 * Returns distance in meters.
 */
export function haversineMeters(
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

/**
 * Format distance for display.
 * Shows meters if < 1000m, otherwise kilometers.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}