// lib/nearby-detector.ts
// 1km radius vehicle filter for real-time tracking optimization
// Only shows vehicles within 1km of commuter's current location

export interface VehicleLocation {
  id: string;
  plateNumber: string;
  lat: number;
  lng: number;
  capacityStatus: "Available" | "Full";
  speed: number;
  lastUpdated: Date;
}

export interface NearbyVehicle extends VehicleLocation {
  distanceInMeters: number;
  estimatedArrivalMinutes: number;
}

/** Default radius in kilometers for nearby vehicle detection */
export const NEARBY_RADIUS_KM = 1;

/**
 * Filter vehicles to only those within the specified radius.
 * Sorts by distance (closest first).
 */
export function filterNearbyVehicles(
  vehicles: VehicleLocation[],
  commuterLat: number,
  commuterLng: number,
  radiusKm: number = NEARBY_RADIUS_KM
): NearbyVehicle[] {
  const radiusMeters = radiusKm * 1000;

  const nearby: NearbyVehicle[] = vehicles
    .filter((v) => v.capacityStatus === "Available") // Only show available jeeps
    .map((v) => {
      const distanceInMeters = calculateDistance(
        commuterLat,
        commuterLng,
        v.lat,
        v.lng
      );
      const estimatedArrivalMinutes = estimateArrival(
        distanceInMeters,
        v.speed
      );
      return {
        ...v,
        distanceInMeters,
        estimatedArrivalMinutes,
      };
    })
    .filter((v) => v.distanceInMeters <= radiusMeters)
    .sort((a, b) => a.distanceInMeters - b.distanceInMeters);

  return nearby;
}

/**
 * Haversine formula — calculates the great-circle distance
 * between two points on Earth. Returns distance in meters.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate arrival time in minutes.
 * Assumes average jeepney speed of 30 km/h in urban areas,
 * adjusted by the vehicle's reported speed.
 */
function estimateArrival(distanceMeters: number, vehicleSpeed: number): number {
  // Use reported speed if available, otherwise assume 30 km/h
  const speedKmH = vehicleSpeed > 0 ? vehicleSpeed : 30;
  const speedMetersPerMin = (speedKmH * 1000) / 60;
  return Math.max(1, Math.round(distanceMeters / speedMetersPerMin));
}

/**
 * Check if a vehicle is moving toward the commuter.
 * Compares current position to previous position relative to commuter.
 */
export function isVehicleApproaching(
  vehicleLat: number,
  vehicleLng: number,
  prevLat: number,
  prevLng: number,
  commuterLat: number,
  commuterLng: number
): boolean {
  const currentDist = calculateDistance(
    vehicleLat,
    vehicleLng,
    commuterLat,
    commuterLng
  );
  const prevDist = calculateDistance(
    prevLat,
    prevLng,
    commuterLat,
    commuterLng
  );
  return currentDist < prevDist;
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
