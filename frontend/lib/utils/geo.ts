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

/** Shortest distance from a [lat, lng] point to a route polyline. */
export function distanceToPolylineMeters(
  point: [number, number],
  coordinates: [number, number][]
): number {
  if (coordinates.length < 2) return Number.POSITIVE_INFINITY;

  const referenceLatitude = (point[0] * Math.PI) / 180;
  let minimumDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index];
    const end = coordinates[index + 1];
    const startX = ((start[1] - point[1]) * Math.PI / 180) * Math.cos(referenceLatitude) * EARTH_RADIUS_M;
    const startY = ((start[0] - point[0]) * Math.PI / 180) * EARTH_RADIUS_M;
    const endX = ((end[1] - point[1]) * Math.PI / 180) * Math.cos(referenceLatitude) * EARTH_RADIUS_M;
    const endY = ((end[0] - point[0]) * Math.PI / 180) * EARTH_RADIUS_M;
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const lengthSquared = segmentX ** 2 + segmentY ** 2;
    const projection = lengthSquared > 0
      ? Math.max(0, Math.min(1, -(startX * segmentX + startY * segmentY) / lengthSquared))
      : 0;
    const closestX = startX + projection * segmentX;
    const closestY = startY + projection * segmentY;
    minimumDistance = Math.min(minimumDistance, Math.hypot(closestX, closestY));
  }

  return minimumDistance;
}
