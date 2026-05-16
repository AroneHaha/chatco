// lib/nearby-detector.ts
// 1km radius vehicle filter for real-time tracking optimization
// Only shows vehicles within 1km of commuter's current location
//
// Haversine imported from @/lib/utils/geo (canonical source).

import { haversineMeters, formatDistance } from "./utils/geo";

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
 * Calculate distance using shared haversine implementation.
 * Re-exported for backward compatibility.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return haversineMeters(lat1, lng1, lat2, lng2);
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

// Re-export formatDistance for backward compatibility
export { formatDistance };
