// lib/nearby-detector.ts
// Conductor-radius vehicle validation for real-time ETA + hail control.
//
// ARCHITECTURE CHANGE:
// Previously: 1km radius was commuter-centric (filter vehicles near commuter)
// Now: 1km radius is conductor-centric (validate commuter against each conductor's radius)
//
// This means:
// - Commuters can SEE all vehicles on the map regardless of distance
// - ETA and hail are ONLY available when commuter is within a conductor's 1km radius
// - The radius belongs to the conductor/unit, not the commuter
//
// Haversine imported from @/lib/utils/geo (canonical source).

import { haversineMeters, formatDistance } from "../../utils/geo";

// ─── Fixed Speed Constant ────────────────────────────────────────────
// Average jeepney speed = 25 km/h as specified.
// Do NOT change unless explicitly instructed.
const JEEPNEY_SPEED_KMH = 25;

// ─── GPS Status ──────────────────────────────────────────────────────
// Shared between commuter-map and dashboard for GPS state communication.
export type GpsStatus = "loading" | "available" | "denied" | "unavailable";

// ─── Vehicle Types ───────────────────────────────────────────────────

export interface VehicleLocation {
  id: string;
  plateNumber: string;
  lat: number;
  lng: number;
  // Extended to include "Standing" — repo has 3 capacity states
  capacityStatus: "Available" | "Standing" | "Full";
  speed: number;
  lastUpdated: Date;
}

export interface NearbyVehicle extends VehicleLocation {
  distanceInMeters: number;
  estimatedArrivalMinutes: number;
}

/** Default radius in kilometers for conductor operational zone */
export const NEARBY_RADIUS_KM = 1;

// ─── Conductor Radius Validation ─────────────────────────────────────

/**
 * Result of validating commuter position against all conductor radii.
 *
 * WHY NEW: The old filterNearbyVehicles only returned vehicles within 1km
 * of the commuter. It couldn't express "here are ALL vehicles, but only these
 * are within conductor radius." The new type carries both sets of information
 * so the UI can show all markers while gating ETA/hail on radius validation.
 */
export interface ConductorRadiusResult {
  /** All vehicles with computed distance from commuter (for map display) */
  allVehiclesWithDistance: NearbyVehicle[];
  /** Vehicles whose 1km conductor radius includes the commuter (for ETA + hail) */
  withinRadius: NearbyVehicle[];
  /** Whether commuter is within ANY conductor's 1km radius (for hail button) */
  isWithinAnyRadius: boolean;
  /** Nearest vehicle within radius (for primary ETA display). null if none in range. */
  nearestWithinRadius: NearbyVehicle | null;
}

/**
 * Validate commuter position against each conductor/unit's 1km operational radius.
 *
 * WHY NEW (vs reusing filterNearbyVehicles):
 * 1. filterNearbyVehicles filters OUT vehicles beyond 1km — we need ALL vehicles visible
 * 2. filterNearbyVehicles only returns "nearby" set — we need both "all" and "within radius"
 * 3. The radius now belongs to the conductor, not the commuter — semantic shift
 * 4. We need isWithinAnyRadius and nearestWithinRadius for dashboard UI
 *
 * The existing filterNearbyVehicles is kept for backward compatibility.
 */
export function validateConductorRadius(
  vehicles: VehicleLocation[],
  commuterLat: number,
  commuterLng: number,
  radiusKm: number = NEARBY_RADIUS_KM
): ConductorRadiusResult {
  const radiusMeters = radiusKm * 1000;

  // Compute distance for ALL vehicles (needed for map markers)
  const allVehiclesWithDistance: NearbyVehicle[] = vehicles
    .map((v) => {
      const distanceInMeters = calculateDistance(
        commuterLat,
        commuterLng,
        v.lat,
        v.lng
      );
      const estimatedArrivalMinutes = estimateArrival(distanceInMeters);
      return {
        ...v,
        distanceInMeters,
        estimatedArrivalMinutes,
      };
    })
    .sort((a, b) => a.distanceInMeters - b.distanceInMeters);

  // Only non-Full vehicles whose conductor radius includes the commuter
  // can be hailed. Full vehicles still appear on the map but are not hailable.
  const withinRadius = allVehiclesWithDistance.filter(
    (v) => v.capacityStatus !== "Full" && v.distanceInMeters <= radiusMeters
  );

  const isWithinAnyRadius = withinRadius.length > 0;
  const nearestWithinRadius = withinRadius[0] || null;

  return {
    allVehiclesWithDistance,
    withinRadius,
    isWithinAnyRadius,
    nearestWithinRadius,
  };
}

// ─── Legacy Functions (kept for backward compatibility) ──────────────

/**
 * Filter vehicles to only those within the specified radius.
 * Sorts by distance (closest first).
 *
 * @deprecated Use validateConductorRadius for conductor-centric radius logic.
 * This function is kept for backward compatibility with conductor-side code
 * that still uses the commuter-centric filtering model.
 */
export function filterNearbyVehicles(
  vehicles: VehicleLocation[],
  commuterLat: number,
  commuterLng: number,
  radiusKm: number = NEARBY_RADIUS_KM
): NearbyVehicle[] {
  const radiusMeters = radiusKm * 1000;

  const nearby: NearbyVehicle[] = vehicles
    .filter((v) => v.capacityStatus === "Available")
    .map((v) => {
      const distanceInMeters = calculateDistance(
        commuterLat,
        commuterLng,
        v.lat,
        v.lng
      );
      const estimatedArrivalMinutes = estimateArrival(distanceInMeters);
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

// ─── Shared Utilities ────────────────────────────────────────────────

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
 * Uses fixed average jeepney speed of 25 km/h as specified.
 *
 * WHY CHANGED: Previous implementation used 30 km/h and accepted
 * a vehicle speed parameter. The spec requires a fixed 25 km/h constant.
 * The vehicle speed parameter is ignored to maintain a consistent
 * production-grade assumption.
 */
function estimateArrival(distanceMeters: number): number {
  const speedMetersPerMin = (JEEPNEY_SPEED_KMH * 1000) / 60;
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